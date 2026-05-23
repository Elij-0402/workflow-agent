"use client";

import { useMemo } from "react";

import { getBookColorHsl } from "@/lib/compare/book-color";
import { useSyncContext } from "@/lib/compare/sync-context";
import { SuspenseGridResultSchema, type SuspenseGridResult } from "@/lib/types";

type Book = {
  bookId: string;
  label: string;
  index: number;
  result: unknown;
};

type ParsedBook = { book: Book; data: SuspenseGridResult };

const KIND_LABEL: Record<SuspenseGridResult["threads"][number]["kind"], string> = {
  foreshadow: "伏笔",
  mystery: "谜团",
  deferred_promise: "延迟承诺",
  red_herring: "红鲱鱼",
};

const STROKE_DASH: Record<SuspenseGridResult["threads"][number]["kind"], string | undefined> = {
  foreshadow: "3 3",
  mystery: undefined,
  deferred_promise: "1 3",
  red_herring: "5 2 1 2",
};

function parseSeries(books: Book[]): ParsedBook[] {
  const out: ParsedBook[] = [];
  for (const b of books) {
    const p = SuspenseGridResultSchema.safeParse(b.result);
    if (p.success) out.push({ book: b, data: p.data });
  }
  return out;
}

function maxChapterOf(series: ParsedBook[]): number {
  let m = 1;
  for (const { data } of series) {
    for (const t of data.threads) {
      if (t.setup_chapter > m) m = t.setup_chapter;
      if (t.payoff_chapter !== null && t.payoff_chapter > m) m = t.payoff_chapter;
    }
  }
  return m;
}

export function SuspenseGridOverlay({ books }: { books: Book[] }) {
  const series = useMemo(() => parseSeries(books), [books]);
  const { hoverChapter, anchorChapter, setHover, setAnchor, toggleAnchor } = useSyncContext();
  const ruler = hoverChapter ?? anchorChapter;
  const xMax = maxChapterOf(series);

  if (series.length === 0) {
    return (
      <div className="surface-subtle px-4 py-6 text-center font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground/70">
        无可用悬念分布数据
      </div>
    );
  }

  const width = 880;
  const pad = { top: 14, right: 18, bottom: 26, left: 14 };
  const bandTitleHeight = 18;
  const threadRowHeight = 18;
  const bands = series.map(({ book, data }) => ({
    book,
    data,
    laneCount: Math.max(data.threads.length, 1),
  }));
  const bandHeights = bands.map((b) => bandTitleHeight + b.laneCount * threadRowHeight + 8);
  const totalInner = bandHeights.reduce((a, b) => a + b, 0);
  const height = pad.top + totalInner + pad.bottom;
  const innerLeft = pad.left;
  const innerRight = width - pad.right;
  const xOf = (idx: number) => innerLeft + (idx / xMax) * (innerRight - innerLeft);

  const handleMouseMove: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const ratio = (px - innerLeft) / (innerRight - innerLeft);
    if (ratio < 0 || ratio > 1) {
      setHover(null);
      return;
    }
    setHover(Math.round(ratio * xMax));
  };

  const handleClick: React.MouseEventHandler<SVGSVGElement> = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const ratio = (px - innerLeft) / (innerRight - innerLeft);
    if (ratio < 0 || ratio > 1) return;
    toggleAnchor(Math.round(ratio * xMax));
  };

  let cursorY = pad.top;

  return (
    <div className="surface-panel px-3 py-3">
      <div className="overflow-x-auto rounded-[3px] border border-border bg-background/40">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label="suspense grid overlay"
          className="block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          onClick={handleClick}
        >
          {bands.map(({ book, data }, bi) => {
            const bandTop = cursorY;
            const bookColor = getBookColorHsl(book.index);
            const titleY = bandTop + bandTitleHeight - 6;
            const threads = data.threads;
            const unresolvedSet = new Set(data.unresolved);

            const elements = (
              <g key={book.bookId}>
                <line
                  x1={innerLeft}
                  y1={bandTop}
                  x2={innerRight}
                  y2={bandTop}
                  stroke="hsl(var(--border))"
                  strokeOpacity={bi === 0 ? 0 : 0.6}
                />
                <rect
                  x={innerLeft}
                  y={bandTop + 4}
                  width={3}
                  height={bandTitleHeight + threads.length * threadRowHeight - 2}
                  fill={bookColor}
                />
                <text
                  x={innerLeft + 10}
                  y={titleY}
                  fontSize={10.5}
                  style={{ fontFamily: "var(--font-mono)" }}
                  fill={bookColor}
                  letterSpacing={1.2}
                >
                  {book.label}
                </text>
                <text
                  x={innerRight}
                  y={titleY}
                  fontSize={9}
                  fill="hsl(var(--muted-foreground))"
                  textAnchor="end"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {threads.length} 线索 · {unresolvedSet.size} 未回收
                </text>
                {threads.map((t, ti) => {
                  const y = bandTop + bandTitleHeight + ti * threadRowHeight + threadRowHeight / 2;
                  const x1 = xOf(t.setup_chapter);
                  const isUnresolved = t.payoff_chapter === null || unresolvedSet.has(t.id);
                  const x2 = t.payoff_chapter !== null ? xOf(t.payoff_chapter) : innerRight;
                  const radius = 3 + t.strength / 3;
                  return (
                    <g key={t.id}>
                      <line
                        x1={x1}
                        y1={y}
                        x2={x2}
                        y2={y}
                        stroke={bookColor}
                        strokeOpacity={isUnresolved ? 0.28 : 0.6}
                        strokeWidth={1}
                        strokeDasharray={STROKE_DASH[t.kind]}
                      />
                      <circle cx={x1} cy={y} r={radius} fill={bookColor} />
                      {t.payoff_chapter !== null ? (
                        <circle
                          cx={x2}
                          cy={y}
                          r={radius}
                          fill={bookColor}
                          fillOpacity={0.55}
                        />
                      ) : (
                        <text
                          x={x2 - 2}
                          y={y + 4}
                          fontSize={11}
                          fill={bookColor}
                          textAnchor="end"
                          fillOpacity={0.85}
                        >
                          ☆
                        </text>
                      )}
                      <text
                        x={innerLeft + 16}
                        y={y - 5}
                        fontSize={9.5}
                        fill="hsl(var(--muted-foreground))"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {t.label} · {KIND_LABEL[t.kind]}
                        {isUnresolved ? " · 未回收" : ""}
                      </text>
                    </g>
                  );
                })}
              </g>
            );

            cursorY = bandTop + bandTitleHeight + threads.length * threadRowHeight + 8;
            return elements;
          })}

          {ruler !== null ? (
            <line
              x1={xOf(ruler)}
              y1={pad.top}
              x2={xOf(ruler)}
              y2={height - pad.bottom}
              stroke={
                anchorChapter !== null && ruler === anchorChapter
                  ? "hsl(var(--primary))"
                  : "hsl(var(--muted-foreground))"
              }
              strokeWidth={anchorChapter !== null && ruler === anchorChapter ? 1.2 : 1}
              strokeDasharray={
                anchorChapter !== null && ruler === anchorChapter ? undefined : "3 3"
              }
            />
          ) : null}

          <line
            x1={innerLeft}
            y1={height - pad.bottom + 4}
            x2={innerRight}
            y2={height - pad.bottom + 4}
            stroke="hsl(var(--border))"
          />
          <text
            x={innerLeft}
            y={height - pad.bottom + 18}
            fontSize={9}
            fill="hsl(var(--muted-foreground))"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            chapter 0
          </text>
          <text
            x={innerRight}
            y={height - pad.bottom + 18}
            fontSize={9}
            fill="hsl(var(--muted-foreground))"
            textAnchor="end"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            chapter {xMax}
          </text>
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
        <span>线型: 谜团实线 / 伏笔 3-3 / 延迟 1-3 / 红鲱鱼 5-2-1-2</span>
        <span>
          {ruler !== null ? `ch.${ruler}` : "hover the grid"}
          {anchorChapter !== null ? (
            <button
              type="button"
              onClick={() => setAnchor(null)}
              className="ml-2 underline-offset-2 hover:underline"
            >
              clear anchor (esc)
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}
