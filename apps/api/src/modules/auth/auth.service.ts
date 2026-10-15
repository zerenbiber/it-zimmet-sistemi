import { randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Role } from "../../generated/prisma/enums.js";
import { badRequest, notFound, unauthorized } from "../../lib/http-error.js";
import { passwordResetCodeMail, sendMail } from "../../lib/mailer.js";
import { hashPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import type { ChangePasswordInput, ForgotPasswordInput, LoginInput, ResetPasswordInput } from "./auth.schemas.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  hashResetCode,
  refreshTokenExpiry,
  signAccessToken,
} from "./tokens.js";

const RESET_CODE_VALID_MINUTES = 15;
const RESET_CODE_MAX_ATTEMPTS = 5;

/** E-posta bulunamazsa bununla karşılaştırılır; cevap süresinden hangi e-postanın kayıtlı olduğu anlaşılmasın. */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("timing-attack-dummy-password", 12);

const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  title: true,
  phone: true,
  lastLoginAt: true,
  mustChangePassword: true,
  department: { select: { id: true, name: true } },
} as const;

async function issueTokens(user: { id: string; role: Role; mustChangePassword: boolean }) {
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashRefreshToken(refreshToken), expiresAt: refreshTokenExpiry() },
  });

  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
  return { accessToken, refreshToken };
}

export async function login({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches || !user.isActive || user.deletedAt) {
    throw unauthorized("E-posta veya şifre hatalı.", "INVALID_CREDENTIALS");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: publicUserSelect,
  });

  return { user: updatedUser, ...(await issueTokens(user)) };
}

/**
 * Refresh token'ı yeniler. Önceden iptal edilmiş bir token gelirse çalınmış
 * sayılır ve kullanıcının tüm açık oturumları kapatılır.
 */
export async function refresh(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    include: {
      user: { select: { id: true, role: true, mustChangePassword: true, isActive: true, deletedAt: true } },
    },
  });

  if (!stored) {
    throw unauthorized("Geçersiz yenileme anahtarı.", "INVALID_REFRESH_TOKEN");
  }

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw unauthorized("Geçersiz yenileme anahtarı.", "INVALID_REFRESH_TOKEN");
  }

  if (stored.expiresAt <= new Date() || !stored.user.isActive || stored.user.deletedAt) {
    throw unauthorized("Oturumun süresi doldu, lütfen tekrar giriş yapın.", "REFRESH_TOKEN_EXPIRED");
  }

  // Koşullu güncelleme sayesinde aynı token'la gelen iki eş zamanlı istekten sadece biri geçer.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) {
    throw unauthorized("Geçersiz yenileme anahtarı.", "INVALID_REFRESH_TOKEN");
  }

  return issueTokens(stored.user);
}

export async function logout(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true, deletedAt: null },
    select: publicUserSelect,
  });

  if (!user) {
    throw notFound("Kullanıcı bulunamadı.");
  }
  return user;
}

/**
 * "Şifremi unuttum": e-postaya 6 haneli kod gönderir. Kullanıcının mevcut şifresi
 * kod girilene kadar değişmez. E-posta kayıtlı olsun olmasın cevap aynıdır, böylece
 * bu uç noktayla hangi e-postaların sistemde olduğu öğrenilemez.
 */
export async function requestPasswordReset({ email }: ForgotPasswordInput) {
  const user = await prisma.user.findFirst({ where: { email, isActive: true, deletedAt: null } });
  if (!user) {
    return;
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetCodeHash: hashResetCode(user.id, code),
      resetCodeExpiresAt: new Date(Date.now() + RESET_CODE_VALID_MINUTES * 60 * 1000),
      resetCodeAttempts: 0,
    },
  });

  // Gönderim beklenmez: beklenseydi cevap süresinden e-postanın kayıtlı olduğu anlaşılabilirdi.
  sendMail(
    passwordResetCodeMail({ to: user.email, firstName: user.firstName, code, validMinutes: RESET_CODE_VALID_MINUTES }),
  ).catch((error: unknown) => console.error("Password reset e-mail failed:", error));
}

/** Kod doğruysa yeni şifreyi kaydeder ve açık oturumların hepsini kapatır. */
export async function resetPasswordWithCode({ email, code, newPassword }: ResetPasswordInput) {
  const invalid = () => badRequest("Kod hatalı ya da süresi dolmuş.", "INVALID_RESET_CODE");

  const user = await prisma.user.findFirst({ where: { email, isActive: true, deletedAt: null } });
  if (!user?.resetCodeHash || !user.resetCodeExpiresAt || user.resetCodeExpiresAt <= new Date()) {
    throw invalid();
  }
  if (user.resetCodeAttempts >= RESET_CODE_MAX_ATTEMPTS) {
    throw badRequest("Çok fazla hatalı deneme yapıldı. Yeni bir kod isteyin.", "RESET_CODE_LOCKED");
  }

  const expected = Buffer.from(user.resetCodeHash, "hex");
  const actual = Buffer.from(hashResetCode(user.id, code), "hex");
  if (!timingSafeEqual(expected, actual)) {
    await prisma.user.update({ where: { id: user.id }, data: { resetCodeAttempts: { increment: 1 } } });
    throw invalid();
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        resetCodeHash: null,
        resetCodeExpiresAt: null,
        resetCodeAttempts: 0,
      },
    }),
    prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

/**
 * Şifreyi değiştirir, geçici şifre işaretini kaldırır ve diğer tüm oturumları
 * kapatır. Mevcut oturum için yeni bir token çifti döner.
 */
export async function changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordInput) {
  const user = await prisma.user.findFirst({ where: { id: userId, isActive: true, deletedAt: null } });
  if (!user) {
    throw notFound("Kullanıcı bulunamadı.");
  }

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw badRequest("Mevcut şifre hatalı.", "INVALID_CURRENT_PASSWORD");
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw badRequest("Yeni şifre mevcut şifreyle aynı olamaz.", "PASSWORD_REUSED");
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
      select: publicUserSelect,
    }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  return { user: updatedUser, ...(await issueTokens({ ...user, mustChangePassword: false })) };
}
