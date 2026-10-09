import bcrypt from "bcryptjs";
import type { Role } from "../../generated/prisma/enums.js";
import { badRequest, notFound, unauthorized } from "../../lib/http-error.js";
import { hashPassword } from "../../lib/password.js";
import { prisma } from "../../lib/prisma.js";
import type { ChangePasswordInput, LoginInput } from "./auth.schemas.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
} from "./tokens.js";

/** Compared against when the email is unknown, so response timing does not reveal which emails exist. */
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
 * Rotates the refresh token. Presenting an already-revoked token is treated as
 * token theft, so every active session of that user is revoked.
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

  // The conditional update stops two concurrent refreshes with the same token from both succeeding.
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
 * Replaces the password, clears the temporary-password flag and ends every
 * other session, then issues a fresh token pair for the current one.
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
