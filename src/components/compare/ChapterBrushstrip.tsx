"use client";

import { useMemo } from "react";

import { getBookColorHsl } from "@/lib/compare/book-color";
import { useSyncContext } from "@/lib/compare/sync-context";
import {
  EmotionArcResultSchema,
  PacingMapResultSchema,
  SuspenseGridResultSchema,
  type AnalysisDimension,
} from "@/lib/types";

const TIME_SERIES_DIMENSIONS = new Set<AnalysisDimension>([
  "emotion_arc",
  "pacing_map",
  "suspense_grid",
]);

type Book = {
  bookId: string;
  label: string;
  index: number;
  analyses: Partial<Record<AnalysisDimension, unknown>>;
};

type Props = {
  dimension: AnalysisDimension;
  books: Book[];
};

function chaptersFor(book: Book): { indices: number[]; max: number } {
  const out = new Set<number>();
  const ea = EmotionArcResultSchema.safeParse(book.analyses.emotion_arc);
  if (ea.success) for (const c of ea.data.chapters) out.add(c.index);
  const pm = PacingMapResultSchema.safeParse(book.analyses.pacing_map);
  if (pm.success) for (const c of pm.data.chapters) out.add(c.index);
  const sg = SuspenseGridResultSchema.safeParse(book.analyses.suspense_grid);
  if (sg.success) {
    for (const t of sg.data.threads) {
      out.add(t.setup_chapter);
      if (t.payoff_chapter !== null) out.add(t.payoff_chapter);
    }
  }
  const arr = [...out].sort((a, b) => a - b);
  return { indices: arr, max: arr.length ? arr[arr.length - 1] : 0 };
}

export function ChapterBrushstrip({ dimension, books }: Props) {
  const { hoverChapter, anchorChapter, setHover, setAnchor, toggleAnchor } =
    useSyncContext();
  const perBook = useMemo(
    () => books.map((b) => ({ book: b, ...chaptersFor(b) })),
    [books],
  );
  const globalMax = useMemo(
    () => Math.max(1, ...perBook.map((p) => p.max)),
    [perBook],
  );

  if (!TIME_SERIES_DIMENSIONS.has(dimension)) return null;
  if (perBook.every((p) => p.indices.length === 0)) return null;

  const ruler = hoverChapter ?? anchorChapter;

  return (
    <section className="surface-subtle sticky bottom-0 z-10 px-4 py-3">
      <div className="flex items-center justify-between pb-2">
        <p className="eyebrow-label">
          chapter brushstrip · ch.0 → ch.{globalMax}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-muted-foreground/60">
          {anchorChapter !== null ? (
            <>
              <span style={{ color: "hsl(var(--primary))" }}>
                锚定 ch.{anchorChapter}
              </span>
              <button
                type="button"
                onClick={() => setAnchor(null)}
                className="ml-2 underline-offset-2 hover:underline"
              >
                esc 解除
              </button>
            </>
          ) : ruler !== null ? (
            <span>悬停 ch.{ruler}</span>
          ) : (
            <span>hover or click any chart / brushstrip</span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {perBook.map(({ book, indices }) => (
          <div key={book.bookId} className="flex items-center gap-2">
            <span
              className="inline-block w-[18px] font-mono text-[10px] uppercase tracking-[0.08em]"
              style={{ color: getBookColorHsl(book.index, 0.9) }}
            >
              {book.label.replace("BOOK ", "")}
            </span>
            <div
              className="relative h-[14px] flex-1 rounded-[2px] border border-border/50 bg-background/40"
              onMouseLeave={() => setHover(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                if (ratio < 0 || ratio > 1) return;
                setHover(Math.round(ratio * globalMax));
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                if (ratio < 0 || ratio > 1) return;
                toggleAnchor(Math.round(ratio * globalMax));
              }}
            >
              {indices.map((idx) => {
                const left = `${(idx / globalMax) * 100}%`;
                return (
                  <span
                    key={idx}
                    aria-hidden
                    className="absolute top-1/2 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left,
                      background: getBookColorHsl(
                        book.index,
                        ruler === idx ? 1 : 0.7,
                      ),
                      boxShadow:
                        ruler === idx
                          ? `0 0 0 2px ${getBookColorHsl(book.index, 0.25)}`
                          : undefined,
                    }}
                  />
                );
              })}
              {ruler !== null ? (
                <span
                  aria-hidden
                  className="absolute top-0 h-full w-px"
                  style={{
                    left: `${(ruler / globalMax) * 100}%`,
                    background:
                      anchorChapter !== null && ruler === anchorChapter
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground) / 0.7)",
                  }}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
