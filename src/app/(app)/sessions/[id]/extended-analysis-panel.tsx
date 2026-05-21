"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AnalysisDetail } from "@/components/sessions/analysis-detail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DIMENSION_LABELS,
  EXTENDED_ANALYSIS_DIMENSIONS,
  type ExtendedAnalysisDimension,
} from "@/lib/types";

type AnalysisState = "pending" | "loading" | "done" | "error";

type AnalysisRecord = {
  dimension: ExtendedAnalysisDimension;
  result: unknown;
};

type Props = {
  bookId: string;
  analyses: AnalysisRecord[];
  llmConfigured: boolean;
  disabled?: boolean;
};

type DimensionStatus = { state: AnalysisState; result?: unknown };

const TOKEN: Record<ExtendedAnalysisDimension, string> = {
  prose_craft: "prose",
  emotion_arc: "emotion",
  pacing_map: "pacing",
  suspense_grid: "suspense",
};

const HELP: Record<ExtendedAnalysisDimension, string> = {
  prose_craft: "句长、修辞、感官、叙事成分配比 → 雷达图。",
  emotion_arc: "按章节的情感正负向 + 强度 → 曲线图。",
  pacing_map: "按章节的动作 / 对话 / 描写 / 内省占比 → 堆叠柱图。",
  suspense_grid: "伏笔 / 谜团 / 延迟承诺 / 红鲱鱼的设置与回收点 → 悬念格。",
};

function statusCopy(state: AnalysisState) {
  if (state === "done") return { label: "// done", className: "text-flash", glyph: "●" };
  if (state === "loading")
    return { label: "// running", className: "text-primary animate-pulse", glyph: "◐" };
  if (state === "error") return { label: "// error", className: "text-destructive", glyph: "✕" };
  return { label: "// pending", className: "text-muted-foreground", glyph: "○" };
}

export function ExtendedAnalysisPanel({ bookId, analyses, llmConfigured, disabled }: Props) {
  const router = useRouter();
  const initial = useMemo<Record<ExtendedAnalysisDimension, DimensionStatus>>(() => {
    const map = new Map(analyses.map((a) => [a.dimension, a.result]));
    return {
      prose_craft: map.has("prose_craft")
        ? { state: "done", result: map.get("prose_craft") }
        : { state: "pending" },
      emotion_arc: map.has("emotion_arc")
        ? { state: "done", result: map.get("emotion_arc") }
        : { state: "pending" },
      pacing_map: map.has("pacing_map")
        ? { state: "done", result: map.get("pacing_map") }
        : { state: "pending" },
      suspense_grid: map.has("suspense_grid")
        ? { state: "done", result: map.get("suspense_grid") }
        : { state: "pending" },
    };
  }, [analyses]);

  const [items, setItems] = useState(initial);
  const [expanded, setExpanded] = useState<Record<ExtendedAnalysisDimension, boolean>>({
    prose_craft: false,
    emotion_arc: false,
    pacing_map: false,
    suspense_grid: false,
  });

  async function runDimension(dimension: ExtendedAnalysisDimension) {
    setItems((c) => ({ ...c, [dimension]: { ...c[dimension], state: "loading" } }));
    try {
      const res = await fetch("/api/analyze/extended", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, dimension }),
      });
      const payload = (await res.json()) as
        | { ok: true; dimension: ExtendedAnalysisDimension; result: unknown }
        | { error: string };
      if (!res.ok || !("ok" in payload)) {
        const error = "error" in payload ? payload.error : "扩展分析失败。";
        setItems((c) => ({ ...c, [dimension]: { ...c[dimension], state: "error" } }));
        toast.error(`${DIMENSION_LABELS[dimension]}：${error}`);
        return;
      }
      setItems((c) => ({ ...c, [dimension]: { state: "done", result: payload.result } }));
      router.refresh();
    } catch {
      setItems((c) => ({ ...c, [dimension]: { ...c[dimension], state: "error" } }));
      toast.error(`${DIMENSION_LABELS[dimension]}：网络异常，请稍后重试。`);
    }
  }

  const doneCount = EXTENDED_ANALYSIS_DIMENSIONS.filter((d) => items[d].state === "done").length;

  return (
    <section id="extended-analysis-panel" className="space-y-5">
      <div className="space-y-3">
        <p className="eyebrow-label">extended analysis</p>
        <h2 className="font-display text-[28px] italic leading-[1.05] text-foreground">扩展分析</h2>
        <p className="max-w-2xl text-[14px] leading-7 text-muted-foreground">
          按需启用更深层的写作技法、情感曲线、节奏与悬念分析。这些维度会消耗额外
          token，按需勾选。已完成 {doneCount} / {EXTENDED_ANALYSIS_DIMENSIONS.length}。
        </p>
      </div>

      <div className="surface-panel divide-y divide-dashed divide-border/60">
        {EXTENDED_ANALYSIS_DIMENSIONS.map((dimension) => {
          const item = items[dimension];
          const canShowDetail = Boolean(item.result);
          const meta = statusCopy(item.state);
          return (
            <div key={dimension} className="px-5 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
                      {`// ${TOKEN[dimension]}`}
                    </span>
                    <span className={cn("font-mono text-[11px]", meta.className)}>
                      {meta.glyph} {meta.label}
                    </span>
                  </div>
                  <h3 className="font-display text-[20px] italic leading-tight text-foreground">
                    {DIMENSION_LABELS[dimension]}
                  </h3>
                  <p className="max-w-2xl text-[13px] leading-7 text-muted-foreground">
                    {HELP[dimension]}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="terminal"
                    size="sm"
                    disabled={!llmConfigured || disabled || item.state === "loading"}
                    onClick={() => {
                      if (item.state === "done" && typeof window !== "undefined") {
                        const ok = window.confirm(
                          `重新分析「${DIMENSION_LABELS[dimension]}」会再次调用模型并消耗你的 BYOK 配额。继续？`,
                        );
                        if (!ok) return;
                      }
                      void runDimension(dimension);
                    }}
                  >
                    {item.state === "loading" ? (
                      <>
                        <Loader2 className="animate-spin" />
                        running…
                      </>
                    ) : item.state === "done" ? (
                      <>
                        <RefreshCw />$ rerun
                      </>
                    ) : (
                      <>
                        <Sparkles />
                        开始分析
                      </>
                    )}
                  </Button>

                  {canShowDetail ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded((c) => ({ ...c, [dimension]: !c[dimension] }))}
                    >
                      {expanded[dimension] ? (
                        <>
                          <ChevronUp />
                          收起
                        </>
                      ) : (
                        <>
                          <ChevronDown />
                          展开详情
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>

              {canShowDetail && expanded[dimension] ? (
                <div className="mt-5 border-t border-dashed border-border/60 pt-5">
                  <AnalysisDetail dimension={dimension} result={item.result} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
