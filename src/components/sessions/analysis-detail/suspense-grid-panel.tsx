"use client";

import dynamic from "next/dynamic";

import { SuspenseGridResultSchema } from "@/lib/types";

import { InvalidResultNotice, OverflowTable, SectionTitle, Separator } from "./shared";

const SuspenseGridChart = dynamic(
  () => import("@/components/charts/suspense-grid-chart").then((m) => m.SuspenseGridChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return (
    <div className="h-[220px] animate-pulse rounded-[3px] border border-dashed border-border bg-background/30" />
  );
}

const KIND_LABEL: Record<"foreshadow" | "mystery" | "deferred_promise" | "red_herring", string> = {
  foreshadow: "伏笔",
  mystery: "谜团",
  deferred_promise: "延迟承诺",
  red_herring: "红鲱鱼",
};

export function SuspenseGridPanel({ result }: { result: unknown }) {
  const parsed = SuspenseGridResultSchema.safeParse(result);
  if (!parsed.success) return <InvalidResultNotice />;
  const data = parsed.data;

  const maxChapter = data.threads.reduce(
    (m, t) => Math.max(m, t.setup_chapter, t.payoff_chapter ?? 0),
    0,
  );

  return (
    <div className="space-y-6 text-[13px] leading-7 text-muted-foreground">
      <div className="space-y-2">
        <SectionTitle title="悬念格" token="threads" />
        <SuspenseGridChart threads={data.threads} maxChapter={maxChapter} />
      </div>

      <Separator />

      <div className="space-y-3">
        <SectionTitle title="线索清单" token="threads list" />
        <OverflowTable
          headers={["线索", "类型", "埋", "收", "强度"]}
          rows={data.threads.map((t) => [
            t.label,
            KIND_LABEL[t.kind],
            String(t.setup_chapter),
            t.payoff_chapter === null ? "未回收" : String(t.payoff_chapter),
            String(t.strength),
          ])}
        />
      </div>

      {data.unresolved.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-3">
            <SectionTitle title="未回收" token="unresolved" />
            <p className="font-mono text-[12px] text-foreground">{data.unresolved.join(" · ")}</p>
          </div>
        </>
      ) : null}

      <Separator />

      <p className="text-foreground">{data.summary}</p>
    </div>
  );
}
