"use client";

import dynamic from "next/dynamic";

import { PacingMapResultSchema } from "@/lib/types";

import {
  InvalidResultNotice,
  OverflowTable,
  SectionTitle,
  Separator,
} from "./shared";

const PacingStackChart = dynamic(
  () =>
    import("@/components/charts/pacing-stack-chart").then(
      (m) => m.PacingStackChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return (
    <div className="h-[240px] animate-pulse rounded-[3px] border border-dashed border-border bg-background/30" />
  );
}

const TEMPO_LABEL: Record<"slow" | "moderate" | "fast" | "burst", string> = {
  slow: "慢",
  moderate: "中",
  fast: "快",
  burst: "爆发",
};

export function PacingMapPanel({ result }: { result: unknown }) {
  const parsed = PacingMapResultSchema.safeParse(result);
  if (!parsed.success) return <InvalidResultNotice />;
  const data = parsed.data;

  return (
    <div className="space-y-6 text-[13px] leading-7 text-muted-foreground">
      <div className="space-y-2">
        <SectionTitle title="叙事成分堆叠" token="mode mix" />
        <PacingStackChart data={data.chapters} />
      </div>

      <Separator />

      <div className="space-y-3">
        <SectionTitle title="节奏档位" token="tempo" />
        <OverflowTable
          headers={["章节", "档位"]}
          rows={data.chapters.map((c) => [
            String(c.index),
            TEMPO_LABEL[c.tempo],
          ])}
        />
      </div>

      {data.tempo_shifts.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-3">
            <SectionTitle title="节奏切换" token="shifts" />
            <OverflowTable
              headers={["从", "到", "描述"]}
              rows={data.tempo_shifts.map((s) => [
                String(s.from_index),
                String(s.to_index),
                s.description,
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
