const REFRESH_TOKEN_KEY = "zimmet.refreshToken";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// The access token lives only in memory; the refresh token survives reloads.
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
      // Without storage the session simply does not survive a reload.
    }
  },
  clear() {
    accessToken = null;
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Nothing to clear.
    }
  },
  onExpired(listener: (() => void) | null) {
    onSessionExpired = listener;
  },
};

/** Concurrent 401s share one refresh request, because each refresh token can be used only once. */
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

export async function api<T>(path: string, { method = "GET", body, query }: RequestOptions = {}): Promise<T> {
  const send = () =>
    fetch(buildUrl(path, query), {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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
      error?: { code?: string; message?: string; details?: Record<string, string[]> };
    } | null;
    throw new ApiError(
      response.status,
      payload?.error?.message ?? "Sunucuya ulaşılamadı.",
      payload?.error?.code,
      payload?.error?.details,
    );
  }

  return (response.status === 204 ? undefined : await response.json()) as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const firstDetail = Object.values(error.details ?? {}).flat()[0];
    return firstDetail ? `${error.message} ${firstDetail}` : error.message;
  }
  return "Beklenmeyen bir hata oluştu.";
}
