"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { getBookColorHsl } from "@/lib/compare/book-color";
import { DIMENSION_LABELS, type AnalysisDimension } from "@/lib/types";

type Series = {
  index: number;
  label: string;
};

type Props = {
  dimensions: readonly AnalysisDimension[];
  books: Array<{ analyses: Partial<Record<AnalysisDimension, unknown>> }>;
  seriesMeta: Series[];
  height?: number;
};

export function DimensionRadar({
  dimensions,
  books,
  seriesMeta,
  height = 220,
}: Props) {
  const data = dimensions.map((dim) => {
    const row: Record<string, string | number> = {
      axis: DIMENSION_LABELS[dim],
    };
    books.forEach((b, i) => {
      row[`b${i}`] = b.analyses[dim] !== undefined ? 1 : 0;
    });
    return row;
  });

  return (
    <div className="surface-subtle h-full px-3 py-3">
      <div className="flex items-center justify-between pb-1.5">
        <p className="eyebrow-label">coverage</p>
        <p className="font-mono text-[10px] tracking-[0.10em] text-muted-foreground/70">
          7 dim · {books.length} book
        </p>
      </div>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="72%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10.5 }}
            />
            {seriesMeta.map((s) => (
              <Radar
                key={`b${s.index}`}
                name={s.label}
                dataKey={`b${s.index}`}
                stroke={getBookColorHsl(s.index)}
                fill={getBookColorHsl(s.index, 0.18)}
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
              formatter={(v, name) => [v === 1 ? "已分析" : "—", String(name)]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
