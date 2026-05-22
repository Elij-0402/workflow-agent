"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DrawerPayload = {
  title: string;
  bookLabel: string;
  bookIndex: number;
  eyebrow?: string;
  meta?: Array<{ label: string; value: string }>;
  paragraphs?: string[];
  badges?: string[];
};

type DrawerState = {
  payload: DrawerPayload | null;
  open: (p: DrawerPayload) => void;
  close: () => void;
};

const DrawerContext = createContext<DrawerState | null>(null);

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<DrawerPayload | null>(null);

  const open = useCallback((p: DrawerPayload) => setPayload(p), []);
  const close = useCallback(() => setPayload(null), []);

  const value = useMemo(
    () => ({ payload, open, close }),
    [payload, open, close],
  );

  return (
    <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  );
}

export function useDrawer(): DrawerState {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    throw new Error("useDrawer must be used inside <DrawerProvider>");
  }
  return ctx;
}
