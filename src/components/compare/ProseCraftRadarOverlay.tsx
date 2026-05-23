"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { CompareEmptyHint } from "@/components/compare/CompareEmptyHint";
import { getBookColorHsl } from "@/lib/compare/book-color";
import { ProseCraftResultSchema, type ProseCraftResult } from "@/lib/types";

type Book = {
  bookId: string;
  label: string;
  index: number;
  result: unknown;
};

type ParsedBook = { book: Book; data: ProseCraftResult };

const RHETORIC_AXES: Array<{ key: keyof ProseCraftResult["rhetoric_density"]; label: string }> = [
  { key: "metaphor", label: "比喻" },
  { key: "parallelism", label: "排比" },
  { key: "personification", label: "拟人" },
  { key: "irony", label: "反讽" },
  { key: "hyperbole", label: "夸张" },
];

const SENSORY_AXES: Array<{ key: keyof ProseCraftResult["sensory_mix"]; label: string }> = [
  { key: "visual", label: "视" },
  { key: "auditory", label: "听" },
  { key: "tactile", label: "触" },
  { key: "olfactory_gustatory", label: "嗅味" },
  { key: "interoceptive", label: "内感" },
];

function parseSeries(books: Book[]): ParsedBook[] {
  const out: ParsedBook[] = [];
  for (const b of books) {
    const p = ProseCraftResultSchema.safeParse(b.result);
    if (p.success) out.push({ book: b, data: p.data });
  }
  return out;
}

function RadarPair({
  title,
  axes,
  max,
  series,
  getValue,
  height,
}: {
  title: string;
  axes: Array<{ label: string; key: string }>;
  max: number;
  series: ParsedBook[];
  getValue: (data: ProseCraftResult, key: string) => number;
  height: number;
}) {
  const data = axes.map(({ key, label }) => {
    const row: Record<string, string | number> = { axis: label };
    for (const { book, data: d } of series) {
      row[`b${book.index}`] = getValue(d, key);
    }
    return row;
  });

  return (
    <div className="surface-subtle flex flex-col px-3 py-3">
      <div className="flex items-center justify-between pb-1.5">
        <p className="eyebrow-label">{title}</p>
        <p className="font-mono text-[10px] tracking-[0.10em] text-muted-foreground/70">
          max {max}
        </p>
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, max]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
              stroke="hsl(var(--border))"
            />
            {series.map(({ book }) => (
              <Radar
                key={`b${book.index}`}
                name={book.label}
                dataKey={`b${book.index}`}
                stroke={getBookColorHsl(book.index)}
                fill={getBookColorHsl(book.index, 0.18)}
                isAnimationActive={false}
              />
            ))}
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 3,
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(v, name) => [Number(v).toFixed(2), String(name)]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProseCraftRadarOverlay({
  books,
  height = 260,
}: {
  books: Book[];
  height?: number;
}) {
  const series = useMemo(() => parseSeries(books), [books]);

  if (series.length === 0) {
    return <CompareEmptyHint message="无可用写作技法数据" />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <RadarPair
        title="rhetoric density"
        axes={RHETORIC_AXES}
        max={10}
        series={series}
        getValue={(d, k) =>
          (d.rhetoric_density as unknown as Record<string, number>)[k] ?? 0
        }
        height={height}
      />
      <RadarPair
        title="sensory mix"
        axes={SENSORY_AXES}
        max={1}
        series={series}
        getValue={(d, k) => (d.sensory_mix as unknown as Record<string, number>)[k] ?? 0}
        height={height}
      />
    </div>
  );
}
