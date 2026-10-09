import bcrypt from "bcryptjs";
import type { Role } from "../../generated/prisma/enums.js";
import { notFound, unauthorized } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import type { LoginInput } from "./auth.schemas.js";
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
  department: { select: { id: true, name: true } },
} as const;

async function issueTokens(userId: string, role: Role) {
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashRefreshToken(refreshToken), expiresAt: refreshTokenExpiry() },
  });

  return { accessToken: signAccessToken(userId, role), refreshToken };
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

  return { user: updatedUser, ...(await issueTokens(user.id, user.role)) };
}

/**
 * Rotates the refresh token. Presenting an already-revoked token is treated as
 * token theft, so every active session of that user is revoked.
 */
export async function refresh(refreshToken: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(refreshToken) },
    include: { user: { select: { id: true, role: true, isActive: true, deletedAt: true } } },
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

  return issueTokens(stored.user.id, stored.user.role);
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
