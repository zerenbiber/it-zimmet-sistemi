export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthorized = (message = "Kimlik doğrulaması gerekli.", code = "UNAUTHORIZED") =>
  new HttpError(401, message, code);

export const forbidden = (message = "Bu işlem için yetkiniz yok.") =>
  new HttpError(403, message, "FORBIDDEN");

export const notFound = (message = "Kaynak bulunamadı.") => new HttpError(404, message, "NOT_FOUND");
