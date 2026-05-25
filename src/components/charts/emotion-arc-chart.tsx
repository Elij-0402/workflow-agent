"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type EmotionPoint = {
  index: number;
  valence: number;
  intensity: number;
  dominant_emotion?: string;
};

export function EmotionArcChart({
  data,
  height = 220,
}: {
  data: EmotionPoint[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="index"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            stroke="hsl(var(--border))"
            label={{
              value: "chapter",
              position: "insideBottomRight",
              offset: -4,
              fill: "hsl(var(--muted-foreground))",
              fontSize: 10,
            }}
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
          />
          <Area
            yAxisId="valence"
            type="monotone"
            dataKey="valence"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.18}
            isAnimationActive={false}
          />
          <Line
            yAxisId="intensity"
            type="monotone"
            dataKey="intensity"
            stroke="hsl(var(--flash))"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
