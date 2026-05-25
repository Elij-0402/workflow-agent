"use client";

import type { AnalysisDimension } from "@/lib/types";
import { DIMENSION_LABELS } from "@/lib/types";
import { getBookColorHsl } from "@/lib/compare/book-color";

type Props = {
  index: number;
  label: string;
  displayTitle: string;
  wordCount: number | null;
  chapterCount: number | null;
  dimensions: readonly AnalysisDimension[];
  analyses: Partial<Record<AnalysisDimension, unknown>>;
};

const numberFmt = new Intl.NumberFormat("zh-CN");

function formatWordCount(n: number | null): string {
  if (n === null || n < 0) return "—";
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)} 万字`;
  return `${numberFmt.format(n)} 字`;
}

export function BookCard({
  index,
  label,
  displayTitle,
  wordCount,
  chapterCount,
  dimensions,
  analyses,
}: Props) {
  const analyzedCount = dimensions.reduce(
    (n, d) => (analyses[d] !== undefined ? n + 1 : n),
    0,
  );

  return (
    <div className="surface-panel relative flex h-full flex-col overflow-hidden">
      <div
        className="h-[3px] w-full"
        style={{ background: getBookColorHsl(index) }}
      />
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <p
            className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
            style={{ color: getBookColorHsl(index, 0.85) }}
          >
            {label}
          </p>
          <span className="font-mono text-[10px] uppercase tracking-[0.10em] text-muted-foreground/70">
            {analyzedCount}/{dimensions.length} 维
          </span>
        </div>

        <h3 className="line-clamp-2 font-display text-[18px] italic leading-tight text-foreground">
          {displayTitle}
        </h3>

        <div className="flex items-baseline gap-4 border-t border-dashed border-border/60 pt-3 font-mono text-[12px] tabular-nums text-muted-foreground">
          <span>{formatWordCount(wordCount)}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{chapterCount !== null ? `${chapterCount} 章` : "—"}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {dimensions.map((d) => {
            const has = analyses[d] !== undefined;
            return (
              <span
                key={d}
                title={DIMENSION_LABELS[d]}
                className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full border"
                style={{
                  borderColor: has
                    ? getBookColorHsl(index, 0.6)
                    : "hsl(var(--border))",
                  background: has
                    ? getBookColorHsl(index, 0.55)
                    : "transparent",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
