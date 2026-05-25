"use client";

type Thread = {
  id: string;
  label: string;
  setup_chapter: number;
  payoff_chapter: number | null;
  strength: number;
  kind: "foreshadow" | "mystery" | "deferred_promise" | "red_herring";
};

const KIND_COLOR: Record<Thread["kind"], string> = {
  foreshadow: "var(--primary)",
  mystery: "var(--flash)",
  deferred_promise: "var(--destructive)",
  red_herring: "var(--muted-foreground)",
};

const KIND_LABEL: Record<Thread["kind"], string> = {
  foreshadow: "伏笔",
  mystery: "谜团",
  deferred_promise: "延迟承诺",
  red_herring: "红鲱鱼",
};

export function SuspenseGridChart({
  threads,
  maxChapter,
  height = 220,
}: {
  threads: Thread[];
  maxChapter: number;
  height?: number;
}) {
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };
  const innerWidth = 800;
  const innerHeight = height - padding.top - padding.bottom;
  const xMax = Math.max(maxChapter, 1);

  const xOf = (idx: number) =>
    padding.left + (idx / xMax) * (innerWidth - padding.left - padding.right);
  const yOf = (i: number) =>
    padding.top + ((i + 0.5) / Math.max(threads.length, 1)) * innerHeight;

  return (
    <div className="overflow-x-auto rounded-[3px] border border-border bg-background/30">
      <svg
        width={innerWidth}
        height={height}
        role="img"
        aria-label="suspense grid"
        className="block"
      >
        {threads.map((t, i) => {
          const y = yOf(i);
          const x1 = xOf(t.setup_chapter);
          const x2 = t.payoff_chapter !== null ? xOf(t.payoff_chapter) : null;
          const color = `hsl(${KIND_COLOR[t.kind]})`;
          return (
            <g key={t.id}>
              {x2 !== null ? (
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke={color}
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              ) : (
                <line
                  x1={x1}
                  y1={y}
                  x2={innerWidth - padding.right}
                  y2={y}
                  stroke={color}
                  strokeOpacity={0.25}
                  strokeWidth={1}
                />
              )}
              <circle cx={x1} cy={y} r={3 + t.strength / 3} fill={color} />
              {x2 !== null ? (
                <circle
                  cx={x2}
                  cy={y}
                  r={3 + t.strength / 3}
                  fill={color}
                  fillOpacity={0.6}
                />
              ) : null}
              <text
                x={padding.left + 6}
                y={y - 6}
                fontSize={10}
                fill="hsl(var(--muted-foreground))"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {t.label} · {KIND_LABEL[t.kind]}
                {t.payoff_chapter === null ? " · 未回收" : ""}
              </text>
            </g>
          );
        })}
        {/* X-axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom + 4}
          x2={innerWidth - padding.right}
          y2={height - padding.bottom + 4}
          stroke="hsl(var(--border))"
        />
        <text
          x={padding.left}
          y={height - padding.bottom + 18}
          fontSize={9}
          fill="hsl(var(--muted-foreground))"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          chapter 0
        </text>
        <text
          x={innerWidth - padding.right}
          y={height - padding.bottom + 18}
          fontSize={9}
          fill="hsl(var(--muted-foreground))"
          textAnchor="end"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          chapter {xMax}
        </text>
      </svg>
    </div>
  );
}
