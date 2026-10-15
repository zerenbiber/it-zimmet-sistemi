import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Liste filtreleri URL'de tutulur, sayfa yenilense ya da geri gelinse de kaybolmaz. */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();

  const values = Object.fromEntries(keys.map((key) => [key, params.get(key) ?? ""])) as Record<K, string>;
  const page = Math.max(1, Number(params.get("page")) || 1);

  function update(changes: Partial<Record<K | "page", string | number>>) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === "" || value === undefined || (key === "page" && value === 1)) {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        }
        // Filtre değişince ilk sayfaya dönülür.
        if (!("page" in changes)) {
          next.delete("page");
        }
        return next;
      },
      { replace: true },
    );
  }

  return { values, page, update };
}
