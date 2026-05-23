"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AnalysisDetail } from "@/components/sessions/analysis-detail";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ANALYSIS_DIMENSIONS,
  DIMENSION_LABELS,
  type LegacyAnalysisDimension,
  type SessionStatus,
} from "@/lib/types";

type AnalysisState = "pending" | "loading" | "done" | "error";

type AnalysisRecord = {
  dimension: LegacyAnalysisDimension;
  result: unknown;
};

type PanelProps = {
  sessionId: string;
  analyses: AnalysisRecord[];
  llmConfigured: boolean;
  sessionStatus: SessionStatus;
};

type DimensionStatus = {
  state: AnalysisState;
  result?: unknown;
};

function summarizeResult(dimension: LegacyAnalysisDimension, result: unknown) {
  if (!result || typeof result !== "object") {
    return "还没有可用结果。";
  }

  const data = result as Record<string, unknown>;

  switch (dimension) {
    case "worldview":
      return String(data.summary ?? "世界观分析已完成。");
    case "characters":
      return String(data.summary ?? "人物分析已完成。");
    case "narrative":
      return String(data.summary ?? "叙事分析已完成。");
    default:
      return "分析已完成。";
  }
}

function getDimensionActionLabel(state: AnalysisState) {
  if (state === "loading") return "running…";
  if (state === "done") return "$ rerun";
  if (state === "error") return "$ retry";
  return "开始分析";
}

function getDimensionSummary(dimension: LegacyAnalysisDimension, item: DimensionStatus) {
  if (item.state === "loading") {
    return `正在生成${DIMENSION_LABELS[dimension]}分析，请稍候。`;
  }

  if (item.state === "error") {
    return item.result
      ? "本次重试失败，当前仍保留上一次结果。"
      : "当前维度分析失败，可以单独重试。";
  }

  if (item.state === "done") {
    return summarizeResult(dimension, item.result);
  }

  return "还没有开始。";
}

function getStatusCopy(state: AnalysisState) {
  if (state === "done") {
    return { label: "// done", className: "text-flash", glyph: "●" };
  }

  if (state === "loading") {
    return { label: "// running", className: "text-primary animate-pulse", glyph: "◐" };
  }

  if (state === "error") {
    return { label: "// error", className: "text-destructive", glyph: "✕" };
  }

  return { label: "// pending", className: "text-muted-foreground", glyph: "○" };
}

const DIMENSION_TOKEN: Record<LegacyAnalysisDimension, string> = {
  worldview: "world",
  characters: "characters",
  narrative: "narrative",
};

export function AnalysisPanel({ sessionId, analyses, llmConfigured, sessionStatus }: PanelProps) {
  const router = useRouter();
  const initialMap = useMemo<Record<LegacyAnalysisDimension, DimensionStatus>>(() => {
    const done = new Map(analyses.map((item) => [item.dimension, item.result]));
    return {
      worldview: done.has("worldview")
        ? { state: "done", result: done.get("worldview") }
        : { state: "pending" },
      characters: done.has("characters")
        ? { state: "done", result: done.get("characters") }
        : { state: "pending" },
      narrative: done.has("narrative")
        ? { state: "done", result: done.get("narrative") }
        : { state: "pending" },
    };
  }, [analyses]);
  const [items, setItems] = useState(initialMap);
  const [expanded, setExpanded] = useState<Record<LegacyAnalysisDimension, boolean>>({
    worldview: false,
    characters: false,
    narrative: false,
  });

  useEffect(() => {
    setItems((current) => {
      const next = { ...current };

      for (const dimension of ANALYSIS_DIMENSIONS) {
        if (initialMap[dimension].state === "done") {
          next[dimension] = initialMap[dimension];
        } else if (current[dimension]?.state) {
          next[dimension] = current[dimension];
        } else {
          next[dimension] = initialMap[dimension];
        }
      }

      return next;
    });
  }, [initialMap]);

  async function runDimension(dimension: LegacyAnalysisDimension, options?: { refresh?: boolean }) {
    setItems((current) => ({
      ...current,
      [dimension]: {
        ...current[dimension],
        state: "loading",
      },
    }));

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, dimension }),
      });

      const payload = (await response.json()) as
        | { ok: true; dimension: LegacyAnalysisDimension; result: unknown }
        | { error: string };

      if (!response.ok || !("ok" in payload)) {
        const error = "error" in payload ? payload.error : "分析失败，请稍后重试。";
        setItems((current) => ({
          ...current,
          [dimension]: {
            ...current[dimension],
            state: "error",
          },
        }));
        toast.error(`${DIMENSION_LABELS[dimension]}分析失败：${error}`);
        return;
      }

      setItems((current) => ({
        ...current,
        [dimension]: {
          state: "done",
          result: payload.result,
        },
      }));
      if (options?.refresh !== false) {
        router.refresh();
      }
    } catch {
      setItems((current) => ({
        ...current,
        [dimension]: {
          ...current[dimension],
          state: "error",
        },
      }));
      toast.error(`${DIMENSION_LABELS[dimension]}分析失败：请稍后重试。`);
    }
  }

  async function runAll() {
    for (const dimension of ANALYSIS_DIMENSIONS) {
      await runDimension(dimension, { refresh: false });
    }
    router.refresh();
  }

  const hasLoading = ANALYSIS_DIMENSIONS.some((dimension) => items[dimension].state === "loading");
  const blockedByGenerating = sessionStatus === "generating";
  const doneCount = ANALYSIS_DIMENSIONS.filter(
    (dimension) => items[dimension].state === "done",
  ).length;
  const allDone = doneCount === ANALYSIS_DIMENSIONS.length;

  return (
    <section id="analysis-panel" className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="eyebrow-label">analysis</p>
          <h2 className="font-display text-[28px] italic leading-[1.05] text-foreground">
            分析结果
          </h2>
          <p className="max-w-2xl text-[14px] leading-7 text-muted-foreground">
            {allDone
              ? "三项分析已经完成。需要时可以单独重跑某一项。"
              : `先完成三项基础分析。当前已完成 ${doneCount} / ${ANALYSIS_DIMENSIONS.length}。`}
          </p>
          {!llmConfigured ? (
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-primary">
              {"// 先完成模型设置再开始"}
            </p>
          ) : blockedByGenerating ? (
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-primary">
              {"// 当前正在生成，暂不可重新分析"}
            </p>
          ) : null}
        </div>

        {!allDone ? (
          <Button
            onClick={() => void runAll()}
            disabled={!llmConfigured || hasLoading || blockedByGenerating}
          >
            {hasLoading ? (
              <>
                <Loader2 className="animate-spin" />
                分析中…
              </>
            ) : (
              <>
                <Sparkles />
                {doneCount > 0 ? "继续分析" : "开始分析"}
              </>
            )}
          </Button>
        ) : null}
      </div>

      <div className="surface-panel divide-y divide-dashed divide-border/60">
        {ANALYSIS_DIMENSIONS.map((dimension) => {
          const item = items[dimension];
          const canShowDetail = Boolean(item.result);
          const statusCopy = getStatusCopy(item.state);

          return (
            <div key={dimension} className="px-5 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
                      {`// ${DIMENSION_TOKEN[dimension]}`}
                    </span>
                    <span className={cn("font-mono text-[11px]", statusCopy.className)}>
                      {statusCopy.glyph} {statusCopy.label}
                    </span>
                  </div>
                  <h3 className="font-display text-[20px] italic leading-tight text-foreground">
                    {DIMENSION_LABELS[dimension]}
                  </h3>
                  <p className="max-w-2xl text-[13px] leading-7 text-muted-foreground">
                    {getDimensionSummary(dimension, item)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="terminal"
                    size="sm"
                    onClick={() => {
                      if (item.state === "done" && typeof window !== "undefined") {
                        const ok = window.confirm(
                          `重新分析「${DIMENSION_LABELS[dimension]}」会再次调用模型并消耗你的 BYOK 配额。继续？`,
                        );
                        if (!ok) return;
                      }
                      void runDimension(dimension);
                    }}
                    disabled={!llmConfigured || blockedByGenerating || item.state === "loading"}
                  >
                    {item.state === "loading" ? (
                      <>
                        <Loader2 className="animate-spin" />
                        running…
                      </>
                    ) : (
                      <>
                        <RefreshCw />
                        {getDimensionActionLabel(item.state)}
                      </>
                    )}
                  </Button>

                  {canShowDetail ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpanded((current) => ({
                          ...current,
                          [dimension]: !current[dimension],
                        }))
                      }
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
