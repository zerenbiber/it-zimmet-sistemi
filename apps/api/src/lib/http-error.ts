export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    /** İstemciye dönülen ek detay (ör. Excel içe aktarmadaki satır hataları). */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthorized = (message = "Kimlik doğrulaması gerekli.", code = "UNAUTHORIZED") =>
  new HttpError(401, message, code);

export const forbidden = (message = "Bu işlem için yetkiniz yok.", code = "FORBIDDEN") =>
  new HttpError(403, message, code);

export const notFound = (message = "Kaynak bulunamadı.") => new HttpError(404, message, "NOT_FOUND");

export const badRequest = (message: string, code = "BAD_REQUEST") => new HttpError(400, message, code);

export const conflict = (message: string, code = "CONFLICT") => new HttpError(409, message, code);
