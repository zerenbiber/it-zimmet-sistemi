import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, refreshSession, session } from "../api/client";
import type { CurrentUser } from "../api/types";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: CurrentUser };

interface AuthContextValue {
  state: AuthState;
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(() =>
    session.hasRefreshToken() ? { status: "loading", user: null } : { status: "anonymous", user: null },
  );

  const endSession = useCallback(() => {
    session.clear();
    queryClient.clear();
    setState({ status: "anonymous", user: null });
  }, [queryClient]);

  // Sayfa yenilendiğinde oturumu geri yükle.
  useEffect(() => {
    if (state.status !== "loading") {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!(await refreshSession())) {
          throw new Error("session expired");
        }
        const { user } = await api<{ user: CurrentUser }>("/auth/me");
        if (!cancelled) {
          setState({ status: "authenticated", user });
        }
      } catch {
        if (!cancelled) {
          endSession();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.status, endSession]);

  useEffect(() => {
    session.onExpired(endSession);
    return () => session.onExpired(null);
  }, [endSession]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ user: CurrentUser; accessToken: string; refreshToken: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    session.store(result);
    setState({ status: "authenticated", user: result.user });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = session.refreshToken();
    if (refreshToken) {
      await api("/auth/logout", { method: "POST", body: { refreshToken } }).catch(() => undefined);
    }
    endSession();
  }, [endSession]);

  // API diğer tüm oturumları kapatır, bu oturum için yeni token çifti döner.
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const result = await api<{ user: CurrentUser; accessToken: string; refreshToken: string }>(
      "/auth/change-password",
      { method: "POST", body: { currentPassword, newPassword } },
    );
    session.store(result);
    setState({ status: "authenticated", user: result.user });
  }, []);

  const value = useMemo(
    () => ({ state, login, logout, changePassword }),
    [state, login, logout, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

/** Giriş kontrolünün arkasındaki sayfalar için. */
export function useCurrentUser(): CurrentUser {
  const { state } = useAuth();
  if (state.status !== "authenticated") {
    throw new Error("useCurrentUser requires an authenticated session");
  }
  return state.user;
}
