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
  next();
};

/** Must be used after `authenticate`. */
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
