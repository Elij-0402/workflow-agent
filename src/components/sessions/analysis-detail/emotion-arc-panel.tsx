"use client";

import dynamic from "next/dynamic";

import { EmotionArcResultSchema } from "@/lib/types";

import {
  InvalidResultNotice,
  OverflowTable,
  SectionTitle,
  Separator,
} from "./shared";

const EmotionArcChart = dynamic(
  () =>
    import("@/components/charts/emotion-arc-chart").then(
      (m) => m.EmotionArcChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return (
    <div className="h-[220px] animate-pulse rounded-[3px] border border-dashed border-border bg-background/30" />
  );
}

export function EmotionArcPanel({ result }: { result: unknown }) {
  const parsed = EmotionArcResultSchema.safeParse(result);
  if (!parsed.success) return <InvalidResultNotice />;
  const data = parsed.data;

  return (
    <div className="space-y-6 text-[13px] leading-7 text-muted-foreground">
      <div className="space-y-2">
        <SectionTitle title="情感曲线" token="valence + intensity" />
        <EmotionArcChart data={data.chapters} />
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
          {"// 黄铜面积 = 正负向（valence） · 绿线 = 强度（intensity）"}
        </p>
      </div>

      {data.peaks.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-3">
            <SectionTitle title="情感极点" token="peaks" />
            <OverflowTable
              headers={["章节", "类型", "描述"]}
              rows={data.peaks.map((p) => [
                String(p.index),
                p.kind === "high" ? "峰" : "谷",
                p.description,
              ])}
            />
          </div>
        </>
      ) : null}

      <Separator />

      <p className="text-foreground">{data.summary}</p>
    </div>
  );
}
