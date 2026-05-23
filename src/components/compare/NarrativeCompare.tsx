"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { CompareEmptyHint } from "@/components/compare/CompareEmptyHint";
import { Badge } from "@/components/ui/badge";
import { getBookColorHsl } from "@/lib/compare/book-color";
import { useDrawer } from "@/lib/compare/drawer-context";
import { multiwayTag, type MultiwayEntry } from "@/lib/compare/multi-diff";
import { NarrativeResultSchema, type NarrativeResult } from "@/lib/types";

type Book = {
  bookId: string;
  label: string;
  index: number;
  result: unknown;
};

type ParsedBook = { book: Book; data: NarrativeResult };

type TurningPoint = NarrativeResult["turning_points"][number];

type ScatterDatum = {
  position: number;
  impact: number;
  title: string;
  description: string;
  bookIndex: number;
  bookLabel: string;
};

function parseSeries(books: Book[]): ParsedBook[] {
  const out: ParsedBook[] = [];
  for (const b of books) {
    const p = NarrativeResultSchema.safeParse(b.result);
    if (p.success) out.push({ book: b, data: p.data });
  }
  return out;
}

function ChipRow({
  entries,
  series,
}: {
  entries: MultiwayEntry<string>[];
  series: ParsedBook[];
}) {
  if (entries.length === 0) {
    return <p className="text-[13px] text-muted-foreground">—</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((entry) => {
        const text = entry.items[0] ?? entry.key;
        const isShared = entry.tag === "common" || entry.tag === "majority";
        if (isShared) {
          return (
            <Badge key={entry.key} variant="default" className="font-mono text-[11px]">
              {text}
              <span className="ml-1 text-primary/70">×{entry.bookIndices.length}</span>
            </Badge>
          );
        }
        const bookIdx = entry.bookIndices[0];
        const book = series.find((s) => s.book.index === bookIdx)?.book;
        return (
          <Badge
            key={entry.key}
            variant="outline"
            className="font-mono text-[11px]"
            style={{
              borderColor: getBookColorHsl(bookIdx, 0.65),
              color: getBookColorHsl(bookIdx, 0.95),
            }}
          >
            {text}
            <span className="ml-1 opacity-60">{book?.label.replace("BOOK ", "")}</span>
          </Badge>
        );
      })}
    </div>
  );
}

function buildScatterSeries(series: ParsedBook[]) {
  return series.map(({ book, data }) => {
    const total = Math.max(data.turning_points.length, 1);
    const denom = total > 1 ? total - 1 : 1;
    const points: ScatterDatum[] = data.turning_points.map((tp, i) => ({
      position: total === 1 ? 0.5 : i / denom,
      impact: tp.impact,
      title: tp.title,
      description: tp.description,
      bookIndex: book.index,
      bookLabel: book.label,
    }));
    return { book, points };
  });
}

export function NarrativeCompare({ books }: { books: Book[] }) {
  const series = useMemo(() => parseSeries(books), [books]);
  const { open } = useDrawer();

  const themeEntries = useMemo(
    () => multiwayTag(series.map((s) => s.data.themes ?? []), (s) => s),
    [series],
  );
  const conflictEntries = useMemo(
    () => multiwayTag(series.map((s) => s.data.conflicts ?? []), (s) => s),
    [series],
  );
  const scatter = useMemo(() => buildScatterSeries(series), [series]);

  if (series.length === 0) {
    return <CompareEmptyHint message="无可用叙事数据" />;
  }

  const handleScatterClick = (datum: unknown) => {
    const d = datum as ScatterDatum;
    open({
      title: d.title,
      bookLabel: d.bookLabel,
      bookIndex: d.bookIndex,
      eyebrow: "turning point",
      meta: [
        { label: "impact", value: `${d.impact} / 10` },
        { label: "position", value: `${Math.round(d.position * 100)}%` },
      ],
      paragraphs: [d.description],
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="surface-panel overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_1fr_1fr] gap-0 border-b border-border/60 bg-background/40 px-4 py-2">
          <span className="eyebrow-label">book</span>
          <span className="eyebrow-label">structure</span>
          <span className="eyebrow-label">viewpoint</span>
          <span className="eyebrow-label">pacing</span>
        </div>
        {series.map(({ book, data }) => (
          <div
            key={book.bookId}
            className="grid grid-cols-[120px_1fr_1fr_1fr] gap-0 border-b border-border/30 px-4 py-3 last:border-b-0"
            style={{ borderLeft: `3px solid ${getBookColorHsl(book.index)}` }}
          >
            <span
              className="font-mono text-[11px] uppercase tracking-[0.10em]"
              style={{ color: getBookColorHsl(book.index, 0.95) }}
            >
              {book.label}
            </span>
            <span className="text-[13px] text-foreground">{data.structure || "—"}</span>
            <span className="text-[13px] text-muted-foreground">{data.viewpoint || "—"}</span>
            <span className="text-[13px] text-muted-foreground">{data.pacing || "—"}</span>
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-baseline gap-3 pb-2">
          <h4 className="font-display text-[16px] italic text-foreground">主题</h4>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/70">
            {`// shared ${themeEntries.filter((e) => e.tag !== "exclusive").length} · exclusive ${themeEntries.filter((e) => e.tag === "exclusive").length}`}
          </span>
        </div>
        <ChipRow entries={themeEntries} series={series} />
      </section>

      <section className="surface-panel px-3 py-3">
        <div className="flex items-baseline gap-3 pb-1">
          <h4 className="font-display text-[16px] italic text-foreground">转折点散布</h4>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/70">
            {`// x = 位序% · y = impact · click for detail`}
          </span>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 12, right: 16, bottom: 18, left: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="position"
                domain={[0, 1]}
                tickFormatter={(v) => `${Math.round(Number(v) * 100)}%`}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                stroke="hsl(var(--border))"
                label={{
                  value: "plot position",
                  position: "insideBottomRight",
                  offset: -4,
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
              <YAxis
                type="number"
                dataKey="impact"
                domain={[0, 10]}
                ticks={[2, 4, 6, 8, 10]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                stroke="hsl(var(--border))"
                width={40}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 3,
                  fontSize: 12,
                }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = payload[0]?.payload as ScatterDatum | undefined;
                  if (!d) return null;
                  return (
                    <div
                      className="rounded-[3px] border border-border bg-popover px-3 py-2"
                      style={{ fontSize: 12 }}
                    >
                      <p
                        className="font-mono text-[10px] uppercase tracking-[0.10em]"
                        style={{ color: getBookColorHsl(d.bookIndex, 0.95) }}
                      >
                        {d.bookLabel}
                      </p>
                      <p className="mt-1 max-w-[280px] text-foreground">{d.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        impact {d.impact} · {Math.round(d.position * 100)}%
                      </p>
                    </div>
                  );
                }}
              />
              {scatter.map(({ book, points }) =>
                points.length === 0 ? null : (
                  <Scatter
                    key={book.bookId}
                    data={points}
                    fill={getBookColorHsl(book.index)}
                    onClick={(d: unknown) => handleScatterClick((d as { payload: ScatterDatum }).payload)}
                    isAnimationActive={false}
                  />
                ),
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <div className="flex items-baseline gap-3 pb-2">
          <h4 className="font-display text-[16px] italic text-foreground">核心冲突</h4>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/70">
            {`// shared ${conflictEntries.filter((e) => e.tag !== "exclusive").length} · exclusive ${conflictEntries.filter((e) => e.tag === "exclusive").length}`}
          </span>
        </div>
        <ChipRow entries={conflictEntries} series={series} />
      </section>
    </div>
  );
}
