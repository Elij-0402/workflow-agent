"use client";

import { BookCard } from "./BookCard";
import { DimensionRadar } from "./DimensionRadar";
import type { AnalysisDimension } from "@/lib/types";

export type AtlasBook = {
  bookId: string;
  label: string;
  displayTitle: string;
  wordCount: number | null;
  chapterCount: number | null;
  analyses: Partial<Record<AnalysisDimension, unknown>>;
};

type Props = {
  dimensions: readonly AnalysisDimension[];
  books: AtlasBook[];
};

export function CompareAtlas({ dimensions, books }: Props) {
  const seriesMeta = books.map((b, i) => ({ index: i, label: b.label }));

  return (
    <section className="grid gap-3 lg:grid-cols-[1fr_320px]">
      <div
        className="grid auto-rows-fr gap-3"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
        }}
      >
        {books.map((b, i) => (
          <BookCard
            key={b.bookId}
            index={i}
            label={b.label}
            displayTitle={b.displayTitle}
            wordCount={b.wordCount}
            chapterCount={b.chapterCount}
            dimensions={dimensions}
            analyses={b.analyses}
          />
        ))}
      </div>
      <DimensionRadar
        dimensions={dimensions}
        books={books}
        seriesMeta={seriesMeta}
      />
    </section>
  );
}
