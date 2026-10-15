import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "zimmet.theme";
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "system" ? stored : "light";
  } catch {
    return "light";
  }
}

function applyTheme(preference: ThemePreference) {
  const resolved = preference === "system" ? (darkQuery().matches ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = resolved;
}

/** Varsayılan açık tema; koyu tema ve "sisteme uy" isteğe bağlı. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);

  useEffect(() => {
    applyTheme(preference);
    if (preference !== "system") {
      return;
    }
    const query = darkQuery();
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  const setTheme = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Bu durumda seçim sadece bu ziyaret boyunca geçerli.
    }
    setPreference(next);
  }, []);

  return { preference, setTheme };
}
