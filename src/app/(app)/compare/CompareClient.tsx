"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ChapterBrushstrip } from "@/components/compare/ChapterBrushstrip";
import { CompareAtlas } from "@/components/compare/CompareAtlas";
import { CompareDimensionPanel } from "@/components/compare/CompareDimensionPanel";
import { DetailDrawer } from "@/components/compare/DetailDrawer";
import { ExportMenu } from "@/components/compare/ExportMenu";
import { InsightsStrip } from "@/components/compare/InsightsStrip";
import { distanceFor } from "@/lib/compare/distance";
import { DrawerProvider } from "@/lib/compare/drawer-context";
import { SyncProvider, useSyncContext } from "@/lib/compare/sync-context";
import {
  ANALYSIS_DIMENSIONS,
  EXTENDED_ANALYSIS_DIMENSIONS,
  type AnalysisDimension,
} from "@/lib/types";

export type CompareBook = {
  bookId: string;
  sessionId: string;
  displayTitle: string;
  wordCount: number | null;
  chapterCount: number | null;
  analyses: Partial<Record<AnalysisDimension, unknown>>;
};

type Props = {
  books: CompareBook[];
};

const COMPARE_DIMENSIONS = [
  ...ANALYSIS_DIMENSIONS,
  ...EXTENDED_ANALYSIS_DIMENSIONS,
] as const satisfies readonly AnalysisDimension[];

const BOOK_LETTERS = ["A", "B", "C", "D", "E", "F"];

function makeLabel(index: number): string {
  return `BOOK ${BOOK_LETTERS[index] ?? index + 1}`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function CompareInner({ books }: Props) {
  const [active, setActive] = useState<AnalysisDimension>(
    COMPARE_DIMENSIONS[0],
  );
  const [isFocus, setIsFocus] = useState(false);
  const { setAnchor } = useSyncContext();
  const snapshotRef = useRef<HTMLDivElement | null>(null);

  const labeled = useMemo(
    () => books.map((b, i) => ({ ...b, label: makeLabel(i) })),
    [books],
  );

  const sessionIds = useMemo(
    () => Array.from(new Set(books.map((b) => b.sessionId))),
    [books],
  );

  const distances = useMemo(() => {
    const out: Partial<Record<AnalysisDimension, number | null>> = {};
    for (const dim of COMPARE_DIMENSIONS) {
      const results = books
        .map((b) => b.analyses[dim])
        .filter((r): r is unknown => r !== undefined);
      out[dim] = distanceFor(dim, results);
    }
    return out;
  }, [books]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === "Escape") {
        setAnchor(null);
        return;
      }
      if (e.key === "f" || e.key === "F") {
        setIsFocus((v) => !v);
        e.preventDefault();
        return;
      }
      const digit = Number(e.key);
      if (
        Number.isInteger(digit) &&
        digit >= 1 &&
        digit <= COMPARE_DIMENSIONS.length
      ) {
        setActive(COMPARE_DIMENSIONS[digit - 1]);
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setAnchor]);

  const brushstripBooks = useMemo(
    () =>
      labeled.map((b, i) => ({
        bookId: b.bookId,
        label: b.label,
        index: i,
        analyses: b.analyses,
      })),
    [labeled],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end gap-2">
        <ExportMenu snapshotRef={snapshotRef} />
      </div>
      <div ref={snapshotRef} className="flex flex-col gap-6">
        {!isFocus ? (
          <CompareAtlas dimensions={COMPARE_DIMENSIONS} books={labeled} />
        ) : null}
        <InsightsStrip sessionIds={sessionIds} />
        <CompareDimensionPanel
          dimensions={COMPARE_DIMENSIONS}
          books={labeled}
          distances={distances}
          active={active}
          onChange={setActive}
        />
      </div>
      <ChapterBrushstrip dimension={active} books={brushstripBooks} />
      <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-muted-foreground/50">
        快捷键 · 1-7 切维度 · f 焦点 · esc 解除锚定
      </p>
    </div>
  );
}

export function CompareClient({ books }: Props) {
  return (
    <SyncProvider>
      <DrawerProvider>
        <CompareInner books={books} />
        <DetailDrawer />
      </DrawerProvider>
    </SyncProvider>
  );
}
