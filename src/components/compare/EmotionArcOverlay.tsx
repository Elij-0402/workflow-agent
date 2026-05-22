"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getBookColorHsl } from "@/lib/compare/book-color";
import { useSyncContext } from "@/lib/compare/sync-context";
import { EmotionArcResultSchema, type EmotionArcResult } from "@/lib/types";

type Book = {
  bookId: string;
  label: string;
  index: number;
  result: unknown;
};

type Row = { chapter: number } & Record<string, number | undefined>;

function buildRows(books: Book[]): { rows: Row[]; series: Book[] } {
  const series: Book[] = [];
  const parsed: Array<{ book: Book; data: EmotionArcResult }> = [];
  for (const b of books) {
    const p = EmotionArcResultSchema.safeParse(b.result);
    if (!p.success) continue;
    parsed.push({ book: b, data: p.data });
    series.push(b);
  }
  const indexSet = new Set<number>();
  for (const { data } of parsed)
    for (const c of data.chapters) indexSet.add(c.index);
  const indices = [...indexSet].sort((a, b) => a - b);
  const rows: Row[] = indices.map((chapter) => {
    const row: Row = { chapter };
    for (const { book, data } of parsed) {
      const c = data.chapters.find((x) => x.index === chapter);
      if (c) {
        row[`v${book.index}`] = c.valence;
        row[`i${book.index}`] = c.intensity;
      }
    }
    return row;
  });
  return { rows, series };
}

export function EmotionArcOverlay({
  books,
  height = 320,
}: {
  books: Book[];
  height?: number;
}) {
  const { rows, series } = useMemo(() => buildRows(books), [books]);
  const { hoverChapter, anchorChapter, setHover, setAnchor, toggleAnchor } =
    useSyncContext();
  const ruler = hoverChapter ?? anchorChapter;

  if (series.length === 0) {
    return (
      <div className="surface-subtle px-4 py-6 text-center font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground/70">
        无可用情感曲线数据
      </div>
    );
  }

  return (
    <div
      className="surface-panel relative px-3 py-3"
      onMouseLeave={() => setHover(null)}
    >
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
            onMouseMove={(state: unknown) => {
              const s = state as { activeLabel?: number | string } | null;
              if (!s) return;
              const n =
                typeof s.activeLabel === "number"
                  ? s.activeLabel
                  : Number(s.activeLabel);
              if (Number.isFinite(n)) setHover(n);
            }}
            onClick={(state: unknown) => {
              const s = state as { activeLabel?: number | string } | null;
              if (!s) return;
              const n =
                typeof s.activeLabel === "number"
                  ? s.activeLabel
                  : Number(s.activeLabel);
              if (Number.isFinite(n)) toggleAnchor(n);
            }}
          >
            <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="chapter"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              yAxisId="valence"
              domain={[-1, 1]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              yAxisId="intensity"
              orientation="right"
              domain={[0, 1]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border))"
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 3,
                fontSize: 12,
              }}
              labelFormatter={(label) => `ch.${label}`}
              formatter={(val, key) => {
                const k = String(key);
                const m = /^([vi])(\d+)$/.exec(k);
                if (!m) return [val, k];
                const which = m[1] === "v" ? "valence" : "intensity";
                const bIdx = Number(m[2]);
                const book = series.find((s) => s.index === bIdx);
                return [
                  Number(val).toFixed(2),
                  `${book?.label ?? `b${bIdx}`} · ${which}`,
                ];
              }}
            />
            {anchorChapter !== null ? (
              <ReferenceLine
                yAxisId="valence"
                x={anchorChapter}
                stroke="hsl(var(--primary))"
                strokeWidth={1.2}
              />
            ) : null}
            {hoverChapter !== null && hoverChapter !== anchorChapter ? (
              <ReferenceLine
                yAxisId="valence"
                x={hoverChapter}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
              />
            ) : null}
            {series.map((b) => (
              <Area
                key={`a${b.index}`}
                yAxisId="intensity"
                type="monotone"
                dataKey={`i${b.index}`}
                stroke="none"
                fill={getBookColorHsl(b.index, 0.12)}
                isAnimationActive={false}
                connectNulls
              />
            ))}
            {series.map((b) => (
              <Line
                key={`l${b.index}`}
                yAxisId="valence"
                type="monotone"
                dataKey={`v${b.index}`}
                stroke={getBookColorHsl(b.index)}
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
        <span>valence (left) · intensity (right, alpha)</span>
        <span>
          {ruler !== null ? `ch.${ruler}` : "hover or click chart"}
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
