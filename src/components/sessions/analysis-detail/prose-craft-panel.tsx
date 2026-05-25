"use client";

import dynamic from "next/dynamic";

import { ProseCraftResultSchema } from "@/lib/types";

import {
  DetailBlock,
  InvalidResultNotice,
  SectionTitle,
  Separator,
} from "./shared";

const RadarPanelChart = dynamic(
  () =>
    import("@/components/charts/radar-panel").then((m) => m.RadarPanelChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

function ChartSkeleton() {
  return (
    <div className="h-[240px] animate-pulse rounded-[3px] border border-dashed border-border bg-background/30" />
  );
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function ProseCraftPanel({ result }: { result: unknown }) {
  const parsed = ProseCraftResultSchema.safeParse(result);
  if (!parsed.success) return <InvalidResultNotice />;
  const data = parsed.data;

  const rhetoric = [
    { axis: "比喻", value: data.rhetoric_density.metaphor },
    { axis: "排比", value: data.rhetoric_density.parallelism },
    { axis: "拟人", value: data.rhetoric_density.personification },
    { axis: "反讽", value: data.rhetoric_density.irony },
    { axis: "夸张", value: data.rhetoric_density.hyperbole },
  ];

  const sensory = [
    { axis: "视觉", value: data.sensory_mix.visual * 10 },
    { axis: "听觉", value: data.sensory_mix.auditory * 10 },
    { axis: "触觉", value: data.sensory_mix.tactile * 10 },
    { axis: "嗅味", value: data.sensory_mix.olfactory_gustatory * 10 },
    { axis: "体感", value: data.sensory_mix.interoceptive * 10 },
  ];

  return (
    <div className="space-y-6 text-[13px] leading-7 text-muted-foreground">
      <div className="grid gap-3 md:grid-cols-3">
        <DetailBlock
          label="avg sentence"
          value={`${data.sentence_length.average.toFixed(1)} 字`}
        />
        <DetailBlock
          label="short / med / long"
          value={`${pct(data.sentence_length.short_pct)} · ${pct(
            data.sentence_length.medium_pct,
          )} · ${pct(data.sentence_length.long_pct)}`}
        />
        <DetailBlock
          label="mode mix"
          value={`对话 ${pct(data.mode_balance.dialogue_pct)} / 描写 ${pct(
            data.mode_balance.description_pct,
          )}`}
        />
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <SectionTitle title="修辞密度" token="rhetoric" />
          <RadarPanelChart data={rhetoric} max={10} />
        </div>
        <div className="space-y-2">
          <SectionTitle title="感官分配" token="sensory" />
          <RadarPanelChart data={sensory} max={10} />
        </div>
      </div>

      {data.signature_techniques.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-3">
            <SectionTitle title="标志性技法" token="signature" />
            <ul className="flex flex-wrap gap-2">
              {data.signature_techniques.map((tech) => (
                <li
                  key={tech}
                  className="rounded-[2px] border border-border bg-background/40 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground"
                >
                  {tech}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <Separator />

      <p className="text-foreground">{data.summary}</p>
    </div>
  );
}
