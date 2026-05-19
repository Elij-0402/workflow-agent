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
  type AnalysisDimension,
  type SessionStatus,
} from "@/lib/types";

type AnalysisState = "pending" | "loading" | "done" | "error";

type AnalysisRecord = {
  dimension: AnalysisDimension;
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

function summarizeResult(dimension: AnalysisDimension, result: unknown) {
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
  if (state === "loading") return "处理中";
  if (state === "done") return "重新分析";
  if (state === "error") return "重试";
  return "单独分析";
}

function getDimensionSummary(
  dimension: AnalysisDimension,
  item: DimensionStatus
) {
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
    return { label: "已完成", className: "text-emerald-300" };
  }

  if (state === "loading") {
    return { label: "分析中", className: "text-amber-300" };
  }

  if (state === "error") {
    return { label: "失败", className: "text-rose-300" };
  }

  return { label: "待开始", className: "text-muted-foreground" };
}

export function AnalysisPanel({
  sessionId,
  analyses,
  llmConfigured,
  sessionStatus,
}: PanelProps) {
  const router = useRouter();
  const initialMap = useMemo<Record<AnalysisDimension, DimensionStatus>>(() => {
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
  const [expanded, setExpanded] = useState<Record<AnalysisDimension, boolean>>({
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

  async function runDimension(
    dimension: AnalysisDimension,
    options?: { refresh?: boolean }
  ) {
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
        | { ok: true; dimension: AnalysisDimension; result: unknown }
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
      // Keep single-dimension failures isolated, but avoid provider burst and status races.
      await runDimension(dimension, { refresh: false });
    }
    router.refresh();
  }

  const hasLoading = ANALYSIS_DIMENSIONS.some(
    (dimension) => items[dimension].state === "loading"
  );
  const blockedByGenerating = sessionStatus === "generating";
  const doneCount = ANALYSIS_DIMENSIONS.filter(
    (dimension) => items[dimension].state === "done"
  ).length;
  const allDone = doneCount === ANALYSIS_DIMENSIONS.length;

  return (
    <section id="analysis-panel" className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="text-[20px] font-medium tracking-tight text-foreground">
            分析结果
          </h2>
          <p className="max-w-2xl text-[14px] leading-6 text-muted-foreground">
            {allDone
              ? "三项分析已经完成。需要时可以单独重跑某一项。"
              : `先完成三项基础分析。当前已完成 ${doneCount} / ${ANALYSIS_DIMENSIONS.length}。`}
          </p>
          {!llmConfigured ? (
            <p className="text-[13px] leading-6 text-amber-200">
              开始分析前，先完成模型设置。
            </p>
          ) : blockedByGenerating ? (
            <p className="text-[13px] leading-6 text-amber-200">
              当前正在生成，暂不可重新分析。
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
                分析中
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

      <div className="overflow-hidden rounded-lg border border-border/60 bg-background/20">
        {ANALYSIS_DIMENSIONS.map((dimension, index) => {
          const item = items[dimension];
          const canShowDetail = Boolean(item.result);
          const statusCopy = getStatusCopy(item.state);

          return (
            <div
              key={dimension}
              className={cn(
                "px-5 py-4",
                index > 0 ? "border-t border-border/60" : ""
              )}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-[15px] font-medium text-foreground">
                      {DIMENSION_LABELS[dimension]}
                    </h3>
                    <span className={cn("text-[13px]", statusCopy.className)}>
                      {statusCopy.label}
                    </span>
                  </div>
                  <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
                    {getDimensionSummary(dimension, item)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Cost guard: re-running a finished dimension burns BYOK
                      // tokens. Confirm before re-spending the user's quota.
                      if (item.state === "done" && typeof window !== "undefined") {
                        const ok = window.confirm(
                          `重新分析「${DIMENSION_LABELS[dimension]}」会再次调用模型并消耗你的 BYOK 配额。继续？`
                        );
                        if (!ok) return;
                      }
                      void runDimension(dimension);
                    }}
                    disabled={
                      !llmConfigured ||
                      blockedByGenerating ||
                      item.state === "loading"
                    }
                  >
                    {item.state === "loading" ? (
                      <>
                        <Loader2 className="animate-spin" />
                        处理中
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
                          收起详情
                        </>
                      ) : (
                        <>
                          <ChevronDown />
                          查看详情
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>

              {canShowDetail && expanded[dimension] ? (
                <div className="mt-4 border-t border-border/60 pt-4">
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
