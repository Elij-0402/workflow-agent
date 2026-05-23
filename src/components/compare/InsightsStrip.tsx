"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClipboard } from "@/lib/compare/clipboard";
import { toastError } from "@/lib/error-toast";
import type { LLMClientError } from "@/lib/llm/errors";
import { DIMENSION_LABELS, type AnalysisDimension } from "@/lib/types";
import { toast } from "sonner";

type Insight = {
  title: string;
  body: string;
  dimension: AnalysisDimension;
  severity: "note" | "finding" | "highlight";
};

const SEVERITY_COLOR: Record<Insight["severity"], string> = {
  note: "hsl(var(--muted-foreground) / 0.5)",
  finding: "hsl(var(--primary))",
  highlight: "hsl(var(--destructive))",
};

const SEVERITY_LABEL: Record<Insight["severity"], string> = {
  note: "note",
  finding: "finding",
  highlight: "highlight",
};

export function InsightsStrip({ sessionIds }: { sessionIds: string[] }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const { add } = useClipboard();

  const canRequest = sessionIds.length >= 2;

  async function handleGenerate() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/compare/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionIds }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        insights?: Insight[];
        error?: string | LLMClientError;
      };
      if (!res.ok || !data.ok || !data.insights) {
        toastError(data.error ?? "生成失败");
        return;
      }
      setInsights(data.insights);
      toast.success(`已生成 ${data.insights.length} 条洞察`);
    } catch {
      toastError("网络异常，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="surface-subtle px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-baseline gap-3">
          <p className="eyebrow-label">ai insights</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-muted-foreground/60">
            {insights ? `${insights.length} insights` : canRequest ? "click ⚡ to generate" : "≥ 2 sessions required"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {insights ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInsights(null)}
              className="h-7 font-mono text-[10.5px] uppercase tracking-[0.08em]"
            >
              clear
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={insights ? "secondary" : "default"}
            disabled={!canRequest || loading}
            onClick={handleGenerate}
            className="h-7 font-mono text-[10.5px] uppercase tracking-[0.08em]"
          >
            {loading ? "生成中…" : insights ? "⚡ 重新生成" : "⚡ 生成洞察"}
          </Button>
        </div>
      </div>

      {loading && !insights ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px] w-full" />
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((ins, i) => (
            <article
              key={i}
              className="surface-panel relative flex flex-col overflow-hidden px-3 py-3"
              style={{ borderLeft: `3px solid ${SEVERITY_COLOR[ins.severity]}` }}
            >
              <div className="flex items-center justify-between pb-1">
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.10em]"
                  style={{ color: SEVERITY_COLOR[ins.severity] }}
                >
                  {SEVERITY_LABEL[ins.severity]} · {DIMENSION_LABELS[ins.dimension]}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    add({
                      kind: "insight",
                      title: ins.title,
                      body: ins.body,
                      dimension: ins.dimension,
                    })
                  }
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70 hover:text-primary"
                >
                  + 剪贴板
                </button>
              </div>
              <h4 className="font-display text-[15px] italic leading-tight text-foreground">
                {ins.title}
              </h4>
              <p className="mt-1.5 text-[12.5px] leading-6 text-muted-foreground">{ins.body}</p>
            </article>
          ))}
        </div>
      ) : insights && insights.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground">未产出 insight。请确认所选项目至少有 2 个维度已分析。</p>
      ) : null}
    </section>
  );
}
