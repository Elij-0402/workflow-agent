"use client";

import { useCallback, useEffect, useState } from "react";

const PREFIX = "ui:tab:";

function isBrowser() {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

/**
 * Tab state with localStorage persistence.
 * Returns [value, setValue].
 * Initial render uses defaultValue (SSR-safe); reads localStorage on mount.
 */
export function useTabState<T extends string>(
  key: string,
  defaultValue: T,
  allowedValues?: readonly T[],
): [T, (next: T) => void] {
  const [value, setValueState] = useState<T>(defaultValue);

  useEffect(() => {
    if (!isBrowser()) return;
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      if (!raw) return;
      if (allowedValues && !allowedValues.includes(raw as T)) return;
      setValueState(raw as T);
    } catch {
      // ignore quota / serialization failures
    }
  }, [key, allowedValues]);

  const setValue = useCallback(
    (next: T) => {
      setValueState(next);
      if (!isBrowser()) return;
      try {
        window.localStorage.setItem(PREFIX + key, next);
      } catch {
        // ignore
      }
    },
    [key],
  );

  return [value, setValue];
}
