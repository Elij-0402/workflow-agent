"use client";

import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { DashboardSummary } from "@/lib/sessions/dashboard";

type SessionsMetricsCollapsibleProps = {
  summary: DashboardSummary | null;
};

export function SessionsMetricsCollapsible({
  summary,
}: SessionsMetricsCollapsibleProps) {
  const active = summary?.activeProjectCount ?? 0;
  const waitingBlueprint = summary?.waitingBlueprintCount ?? 0;
  const briefs = summary?.activeBriefCount ?? 0;
  const variants = summary?.generatedVariantCount ?? 0;

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40">
        <ChevronRight
          aria-hidden
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
        />
        <span className="type-title">项目统计</span>
        <span className="type-caption text-muted-foreground">
          活跃 {active} · 待确认蓝图 {waitingBlueprint} · 活跃简报 {briefs} ·
          已生成版本 {variants} — 点击展开
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 grid gap-4 lg:grid-cols-4">
          <MetricCard label="活跃项目" value={String(active)} />
          <MetricCard label="待确认蓝图" value={String(waitingBlueprint)} />
          <MetricCard label="活跃简报" value={String(briefs)} />
          <MetricCard label="已生成版本" value={String(variants)} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-5">
      <p className="eyebrow-label">{label}</p>
      <p className="type-display mt-3 leading-none">{value}</p>
    </div>
  );
}
