import type { RequestHandler } from "express";
import type { Role } from "../generated/prisma/enums.js";
import { forbidden, unauthorized } from "../lib/http-error.js";
import { verifyAccessToken } from "../modules/auth/tokens.js";

export const authenticate: RequestHandler = (req, _res, next) => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    throw unauthorized();
  }

  req.auth = verifyAccessToken(token);

  // Geçici şifreyle sadece auth uç noktalarına girilebilir, şifre orada değiştirilir.
  if (req.auth.mustChangePassword && req.baseUrl !== "/api/auth") {
    throw forbidden("Devam etmeden önce şifrenizi değiştirmelisiniz.", "PASSWORD_CHANGE_REQUIRED");
  }

  next();
};

/** `authenticate`'ten sonra kullanılmalı. */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) {
      throw unauthorized();
    }
    if (!roles.includes(req.auth.role)) {
      throw forbidden();
    }
    next();
  };
