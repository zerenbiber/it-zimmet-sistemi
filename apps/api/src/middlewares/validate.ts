import type { RequestHandler } from "express";
import type { z } from "zod";

/** Replaces `req.body` with the parsed schema output; ZodErrors are handled by the error handler. */
export const validateBody =
  <T extends z.ZodType>(schema: T): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
