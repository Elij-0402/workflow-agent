"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChapterRow = {
  index: number;
  action_pct: number;
  dialogue_pct: number;
  description_pct: number;
  introspection_pct: number;
};

export function PacingStackChart({ data, height = 240 }: { data: ChapterRow[]; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="index"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
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
            formatter={(v) => `${Math.round(Number(v ?? 0) * 100)}%`}
          />
          <Legend wrapperStyle={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }} />
          <Bar dataKey="action_pct" name="动作" stackId="a" fill="hsl(var(--primary))" />
          <Bar dataKey="dialogue_pct" name="对话" stackId="a" fill="hsl(var(--flash))" />
          <Bar
            dataKey="description_pct"
            name="描写"
            stackId="a"
            fill="hsl(var(--muted-foreground))"
            fillOpacity={0.7}
          />
          <Bar
            dataKey="introspection_pct"
            name="内省"
            stackId="a"
            fill="hsl(var(--destructive))"
            fillOpacity={0.7}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
