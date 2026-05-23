"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getBookColorHsl } from "@/lib/compare/book-color";
import { useSyncContext } from "@/lib/compare/sync-context";
import { PacingMapResultSchema, type PacingMapResult } from "@/lib/types";

type Book = {
  bookId: string;
  label: string;
  index: number;
  result: unknown;
};

const TEMPO_LEVEL: Record<
  PacingMapResult["chapters"][number]["tempo"],
  number
> = {
  slow: 1,
  moderate: 2,
  fast: 3,
  burst: 4,
};

type View = "split" | "tempo";

function parseSeries(books: Book[]) {
  const out: Array<{ book: Book; data: PacingMapResult }> = [];
  for (const b of books) {
    const p = PacingMapResultSchema.safeParse(b.result);
    if (p.success) out.push({ book: b, data: p.data });
  }
  return out;
}

function MiniStack({
  data,
  height,
  colorHue,
  ruler,
  setHover,
  toggleAnchor,
  anchor,
}: {
  data: PacingMapResult["chapters"];
  height: number;
  colorHue: string;
  ruler: number | null;
  setHover: (n: number | null) => void;
  toggleAnchor: (n: number) => void;
  anchor: number | null;
}) {
  return (
    <div style={{ width: "100%", height }} onMouseLeave={() => setHover(null)}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
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
            dataKey="index"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            domain={[0, 1]}
            hide
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 3,
              fontSize: 11,
            }}
            labelFormatter={(l) => `ch.${l}`}
            formatter={(v, k) => [
              `${Math.round(Number(v ?? 0) * 100)}%`,
              String(k),
            ]}
          />
          {anchor !== null ? (
            <ReferenceLine
              x={anchor}
              stroke="hsl(var(--primary))"
              strokeWidth={1.2}
            />
          ) : null}
          {ruler !== null && ruler !== anchor ? (
            <ReferenceLine
              x={ruler}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
            />
          ) : null}
          <Bar
            dataKey="action_pct"
            name="动作"
            stackId="a"
            fill={colorHue}
            fillOpacity={1}
          />
          <Bar
            dataKey="dialogue_pct"
            name="对话"
            stackId="a"
            fill={colorHue}
            fillOpacity={0.75}
          />
          <Bar
            dataKey="description_pct"
            name="描写"
            stackId="a"
            fill={colorHue}
            fillOpacity={0.5}
          />
          <Bar
            dataKey="introspection_pct"
            name="内省"
            stackId="a"
            fill={colorHue}
            fillOpacity={0.28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TempoOverlay({
  series,
  height,
  ruler,
  anchor,
  setHover,
  toggleAnchor,
}: {
  series: Array<{ book: Book; data: PacingMapResult }>;
  height: number;
  ruler: number | null;
  anchor: number | null;
  setHover: (n: number | null) => void;
  toggleAnchor: (n: number) => void;
}) {
  const indexSet = new Set<number>();
  for (const { data } of series)
    for (const c of data.chapters) indexSet.add(c.index);
  const indices = [...indexSet].sort((a, b) => a - b);
  const rows = indices.map((chapter) => {
    const row: Record<string, number> = { chapter };
    for (const { book, data } of series) {
      const c = data.chapters.find((x) => x.index === chapter);
      if (c) row[`b${book.index}`] = TEMPO_LEVEL[c.tempo];
    }
    return row;
  });

  return (
    <div style={{ width: "100%", height }} onMouseLeave={() => setHover(null)}>
      <ResponsiveContainer>
        <LineChart
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
            domain={[0.5, 4.5]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(v) =>
              ["", "slow", "moderate", "fast", "burst"][Number(v) | 0] ?? ""
            }
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            stroke="hsl(var(--border))"
            width={64}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 3,
              fontSize: 12,
            }}
            labelFormatter={(l) => `ch.${l}`}
            formatter={(val, key) => {
              const m = /^b(\d+)$/.exec(String(key));
              const bIdx = m ? Number(m[1]) : -1;
              const book = series.find((s) => s.book.index === bIdx)?.book;
              const tempo =
                ["", "slow", "moderate", "fast", "burst"][Number(val) | 0] ??
                "";
              return [tempo, book?.label ?? `b${bIdx}`];
            }}
          />
          {anchor !== null ? (
            <ReferenceLine
              x={anchor}
              stroke="hsl(var(--primary))"
              strokeWidth={1.2}
            />
          ) : null}
          {ruler !== null && ruler !== anchor ? (
            <ReferenceLine
              x={ruler}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
            />
          ) : null}
          {series.map(({ book }) => (
            <Line
              key={`b${book.index}`}
              type="stepAfter"
              dataKey={`b${book.index}`}
              stroke={getBookColorHsl(book.index)}
              strokeWidth={1.6}
              dot={{ r: 2.5 }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PacingOverlay({
  books,
  height = 320,
}: {
  books: Book[];
  height?: number;
}) {
  const series = useMemo(() => parseSeries(books), [books]);
  const { hoverChapter, anchorChapter, setHover, setAnchor, toggleAnchor } =
    useSyncContext();
  const ruler = hoverChapter ?? anchorChapter;
  const [view, setView] = useState<View>("split");

  if (series.length === 0) {
    return (
      <div className="surface-subtle px-4 py-6 text-center font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground/70">
        无可用节奏数据
      </div>
    );
  }

  const rowHeight =
    view === "split" ? Math.max(80, Math.floor(height / series.length)) : 0;

  return (
    <div className="surface-panel relative px-3 py-3">
      <div className="flex items-center justify-between pb-2">
        <p className="eyebrow-label">pacing overlay</p>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => v && setView(v as View)}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem
            value="split"
            className="font-mono text-[10px] uppercase"
          >
            split
          </ToggleGroupItem>
          <ToggleGroupItem
            value="tempo"
            className="font-mono text-[10px] uppercase"
          >
            tempo
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "split" ? (
        <div className="flex flex-col gap-2">
          {series.map(({ book, data }) => (
            <div key={book.bookId} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-[3px] w-[18px]"
                  style={{ background: getBookColorHsl(book.index) }}
                />
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.10em]"
                  style={{ color: getBookColorHsl(book.index, 0.9) }}
                >
                  {book.label}
                </span>
              </div>
              <MiniStack
                data={data.chapters}
                height={rowHeight}
                colorHue={getBookColorHsl(book.index)}
                ruler={ruler}
                setHover={setHover}
                toggleAnchor={toggleAnchor}
                anchor={anchorChapter}
              />
            </div>
          ))}
        </div>
      ) : (
        <TempoOverlay
          series={series}
          height={height}
          ruler={ruler}
          anchor={anchorChapter}
          setHover={setHover}
          toggleAnchor={toggleAnchor}
        />
      )}

      <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
        <span>
          {view === "split"
            ? "stack: action / dialogue / description / introspection (top→bot)"
            : "tempo level: slow=1 · moderate=2 · fast=3 · burst=4"}
        </span>
        <span>
          {ruler !== null ? `ch.${ruler}` : "hover any chart"}
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
