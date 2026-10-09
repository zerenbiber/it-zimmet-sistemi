import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { Prisma } from "../generated/prisma/client.js";
import { HttpError } from "../lib/http-error.js";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: `${req.method} ${req.path} bulunamadı.` } });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Geçersiz istek verisi.",
        details: z.flattenError(error).fieldErrors,
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details !== undefined && { details: error.details }) },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({ error: { code: "DUPLICATE", message: "Bu değere sahip bir kayıt zaten var." } });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Kaynak bulunamadı." } });
      return;
    }
  }

  if (error instanceof Error && "type" in error && error.type === "entity.too.large") {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Gönderilen dosya veya veri çok büyük." } });
    return;
  }

  // Malformed JSON bodies rejected by express.json()
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "İstek gövdesi geçerli JSON değil." } });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: env.NODE_ENV === "production" ? "Beklenmeyen bir hata oluştu." : String(error),
    },
  });
};
