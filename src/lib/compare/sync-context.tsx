"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SyncState = {
  hoverChapter: number | null;
  anchorChapter: number | null;
  setHover: (idx: number | null) => void;
  setAnchor: (idx: number | null) => void;
  toggleAnchor: (idx: number) => void;
};

const SyncContext = createContext<SyncState | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [hoverChapter, setHoverChapter] = useState<number | null>(null);
  const [anchorChapter, setAnchorChapter] = useState<number | null>(null);

  const setHover = useCallback(
    (idx: number | null) => setHoverChapter(idx),
    [],
  );
  const setAnchor = useCallback(
    (idx: number | null) => setAnchorChapter(idx),
    [],
  );
  const toggleAnchor = useCallback(
    (idx: number) => setAnchorChapter((prev) => (prev === idx ? null : idx)),
    [],
  );

  const value = useMemo(
    () => ({ hoverChapter, anchorChapter, setHover, setAnchor, toggleAnchor }),
    [hoverChapter, anchorChapter, setHover, setAnchor, toggleAnchor],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncContext(): SyncState {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSyncContext must be used inside <SyncProvider>");
  }
  return ctx;
}

export function useActiveChapter(): number | null {
  const { hoverChapter, anchorChapter } = useSyncContext();
  return hoverChapter ?? anchorChapter;
}
