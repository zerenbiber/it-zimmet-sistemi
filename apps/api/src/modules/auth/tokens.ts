import { createHmac, randomBytes } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import { Role } from "../../generated/prisma/enums.js";
import { unauthorized } from "../../lib/http-error.js";

const ACCESS_TOKEN_ISSUER = "it-zimmet-api";

export interface AccessTokenClaims {
  userId: string;
  role: Role;
  /** While true the token only grants access to the auth endpoints. */
  mustChangePassword: boolean;
}

export function signAccessToken({ userId, role, mustChangePassword }: AccessTokenClaims): string {
  return jwt.sign({ role, ...(mustChangePassword && { pwc: true }) }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    issuer: ACCESS_TOKEN_ISSUER,
    algorithm: "HS256",
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  let payload: jwt.JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: ACCESS_TOKEN_ISSUER,
      algorithms: ["HS256"],
    }) as jwt.JwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw unauthorized("Erişim anahtarının süresi doldu.", "TOKEN_EXPIRED");
    }
    throw unauthorized("Geçersiz erişim anahtarı.", "INVALID_TOKEN");
  }

  const role = payload.role as Role;
  if (typeof payload.sub !== "string" || !Object.values(Role).includes(role)) {
    throw unauthorized("Geçersiz erişim anahtarı.", "INVALID_TOKEN");
  }

  return { userId: payload.sub, role, mustChangePassword: payload.pwc === true };
}

/**
 * Refresh tokens are opaque random strings. Only their HMAC is stored, so a
 * database leak does not expose usable tokens.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHmac("sha256", env.JWT_REFRESH_SECRET).update(token).digest("hex");
}

export function refreshTokenExpiry(from = new Date()): Date {
  return new Date(from.getTime() + env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
}
