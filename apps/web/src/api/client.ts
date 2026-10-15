const REFRESH_TOKEN_KEY = "zimmet.refreshToken";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    /** Doğrulama hatalarında alan hataları, içe aktarmada satır hataları. */
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Access token sadece bellekte tutulur; refresh token sayfa yenilense de kalır.
let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;

function readRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export const session = {
  hasRefreshToken: () => readRefreshToken() !== null,
  refreshToken: readRefreshToken,
  store({ accessToken: access, refreshToken }: TokenPair) {
    accessToken = access;
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch {
      // Storage yoksa oturum sayfa yenilenince düşer, o kadar.
    }
  },
  clear() {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Temizlenecek bir şey yok.
    }
  },
  onExpired(listener: (() => void) | null) {
    onSessionExpired = listener;
  },
};

/** Aynı anda gelen 401'ler tek refresh isteğini paylaşır, çünkü her refresh token bir kez kullanılabilir. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    const refreshToken = readRefreshToken();
    if (!refreshToken) {
      return false;
    }
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      session.clear();
      return false;
    }
    session.store((await response.json()) as TokenPair);
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
}

interface RawRequestOptions extends Omit<RequestOptions, "body"> {
  /** JSON'a çevrilmeden olduğu gibi gönderilir (ör. yüklenen dosya). */
  file?: File;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return `/api${path}${search ? `?${search}` : ""}`;
}

/** İsteği gönderir, access token'ın süresi dolduysa bir kez yenileyip tekrar dener. */
async function request(path: string, { method = "GET", body, query, file }: RequestOptions & RawRequestOptions) {
  const send = () =>
    fetch(buildUrl(path, query), {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(file && { "Content-Type": file.type || "application/octet-stream" }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: file ?? (body === undefined ? undefined : JSON.stringify(body)),
    });

  let response = await send();
  const isAuthCall = path.startsWith("/auth/login") || path.startsWith("/auth/refresh");

  if (response.status === 401 && !isAuthCall) {
    if (await refreshSession()) {
      response = await send();
    } else {
      onSessionExpired?.();
    }
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string; details?: unknown };
    } | null;
    throw new ApiError(
      response.status,
      payload?.error?.message ?? "Sunucuya ulaşılamadı.",
      payload?.error?.code,
      payload?.error?.details,
    );
  }

  return response;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await request(path, options);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const response = await request(path, { method: "POST", file });
  return (await response.json()) as T;
}

/** Giriş gerektiren bir uç noktadan dosyayı indirip tarayıcıya verir. */
export async function downloadFile(path: string, query?: Record<string, QueryValue>): Promise<void> {
  const response = await request(path, { query });
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileName = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? "dosya";

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = decodeURIComponent(fileName);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const details = error.details;
    const firstDetail =
      details && typeof details === "object" && !Array.isArray(details)
        ? (Object.values(details).flat()[0] as string | undefined)
        : undefined;
    return firstDetail ? `${error.message} ${firstDetail}` : error.message;
  }
  return "Beklenmeyen bir hata oluştu.";
}
