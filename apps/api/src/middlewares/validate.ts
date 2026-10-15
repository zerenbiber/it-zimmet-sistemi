import type { RequestHandler } from "express";
import type { z } from "zod";

/** `req.body`'yi şemadan geçmiş veriyle değiştirir; ZodError'ları error handler yakalar. */
export const validateBody =
  <T extends z.ZodType>(schema: T): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
