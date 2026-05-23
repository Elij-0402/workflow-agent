"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AnalysisDetail } from "@/components/sessions/analysis-detail";
import { Button } from "@/components/ui/button";
import { toastError } from "@/lib/error-toast";
import type { LLMClientError } from "@/lib/llm/errors";
import { cn } from "@/lib/utils";
import {
  ANALYSIS_DIMENSIONS,
  DIMENSION_LABELS,
  EXTENDED_ANALYSIS_DIMENSIONS,
  type AnalysisDimension,
  type ExtendedAnalysisDimension,
  type LegacyAnalysisDimension,
  type SessionStatus,
} from "@/lib/types";

type AnalysisState = "pending" | "loading" | "done" | "error";

type DimensionStatus = {
  state: AnalysisState;
  result?: unknown;
};

type AnalysisRecord = {
  dimension: AnalysisDimension;
  result: unknown;
};

const EXTENDED_TOKEN: Record<ExtendedAnalysisDimension, string> = {
  prose_craft: "prose",
  emotion_arc: "emotion",
  pacing_map: "pacing",
  suspense_grid: "suspense",
};

const EXTENDED_HELP: Record<ExtendedAnalysisDimension, string> = {
  prose_craft: "句长、修辞、感官、叙事成分配比 → 雷达图。",
  emotion_arc: "按章节的情感正负向 + 强度 → 曲线图。",
  pacing_map: "按章节的动作 / 对话 / 描写 / 内省占比 → 堆叠柱图。",
  suspense_grid: "伏笔 / 谜团 / 延迟承诺 / 红鲱鱼的设置与回收点 → 悬念格。",
};

function summarizeLegacyResult(dimension: LegacyAnalysisDimension, result: unknown) {
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
  if (state === "loading") return "分析中…";
  if (state === "done") return "重新分析";
  if (state === "error") return "重试";
  return "开始分析";
}

function getLegacyStatusCopy(state: AnalysisState) {
  if (state === "done") {
    return { label: "完成", className: "text-flash", glyph: "●" };
  }
  if (state === "loading") {
    return { label: "分析中", className: "text-primary animate-pulse", glyph: "◐" };
  }
  if (state === "error") {
    return { label: "失败", className: "text-destructive", glyph: "✕" };
  }
  return { label: "待开始", className: "text-muted-foreground", glyph: "○" };
}

function getExtendedStatusCopy(state: AnalysisState) {
  if (state === "done") return { label: "// done", className: "text-flash", glyph: "●" };
  if (state === "loading") {
    return { label: "// running", className: "text-primary animate-pulse", glyph: "◐" };
  }
  if (state === "error") return { label: "// error", className: "text-destructive", glyph: "✕" };
  return { label: "// pending", className: "text-muted-foreground", glyph: "○" };
}

function getLegacyDimensionSummary(dimension: LegacyAnalysisDimension, item: DimensionStatus) {
  if (item.state === "loading") {
    return `正在生成${DIMENSION_LABELS[dimension]}分析，请稍候。`;
  }
  if (item.state === "error") {
    return item.result ? "重试失败，保留上次结果" : "本维度分析失败，可单独重试";
  }
  if (item.state === "done") {
    return summarizeLegacyResult(dimension, item.result);
  }
  return "还没有开始。";
}

type LegacyPanelProps = {
  variant: "legacy";
  sessionId: string;
  analyses: AnalysisRecord[];
  llmConfigured: boolean;
  sessionStatus: SessionStatus;
};

type ExtendedPanelProps = {
  variant: "extended";
  bookId: string;
  analyses: AnalysisRecord[];
  llmConfigured: boolean;
  disabled?: boolean;
};

type AnalysisAccordionPanelProps = LegacyPanelProps | ExtendedPanelProps;

export function AnalysisAccordionPanel(props: AnalysisAccordionPanelProps) {
  if (props.variant === "legacy") {
    return <LegacyAnalysisAccordion {...props} />;
  }
  return <ExtendedAnalysisAccordion {...props} />;
}

function LegacyAnalysisAccordion({
  sessionId,
  analyses,
  llmConfigured,
  sessionStatus,
}: LegacyPanelProps) {
  const router = useRouter();
  const dimensions = ANALYSIS_DIMENSIONS;
  const initialMap = useMemo<Record<LegacyAnalysisDimension, DimensionStatus>>(() => {
    const done = new Map(
      analyses.map((item) => [item.dimension as LegacyAnalysisDimension, item.result]),
    );
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
      for (const dimension of dimensions) {
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
  }, [initialMap, dimensions]);

  async function runDimension(
    dimension: LegacyAnalysisDimension,
    options?: { refresh?: boolean },
  ) {
    setItems((current) => ({
      ...current,
      [dimension]: { ...current[dimension], state: "loading" },
    }));

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, dimension }),
      });

      const payload = (await response.json()) as
        | { ok: true; dimension: LegacyAnalysisDimension; result: unknown }
        | { error: string | LLMClientError };

      if (!response.ok || !("ok" in payload)) {
        const error = "error" in payload ? payload.error : "分析失败，请稍后重试。";
        setItems((current) => ({
          ...current,
          [dimension]: { ...current[dimension], state: "error" },
        }));
        toastError(
          typeof error === "string"
            ? `${DIMENSION_LABELS[dimension]}分析失败：${error}`
            : {
                ...error,
                userMessage: `${DIMENSION_LABELS[dimension]}分析失败：${error.userMessage}`,
              },
        );
        return;
      }

      setItems((current) => ({
        ...current,
        [dimension]: { state: "done", result: payload.result },
      }));
      if (options?.refresh !== false) {
        router.refresh();
      }
    } catch {
      setItems((current) => ({
        ...current,
        [dimension]: { ...current[dimension], state: "error" },
      }));
      toastError(`${DIMENSION_LABELS[dimension]}分析失败：请稍后重试。`);
    }
  }

  async function runAll() {
    const pendingDims = dimensions.filter((d) => items[d].state !== "done");
    await Promise.all(pendingDims.map((d) => runDimension(d, { refresh: false })));
    router.refresh();
  }

  const hasLoading = dimensions.some((dimension) => items[dimension].state === "loading");
  const blockedByGenerating = sessionStatus === "generating";
  const doneCount = dimensions.filter((dimension) => items[dimension].state === "done").length;
  const allDone = doneCount === dimensions.length;

  return (
    <section id="analysis-panel" className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <h2 className="text-[20px] font-medium leading-tight text-foreground">分析结果</h2>
          <p className="max-w-2xl text-[13px] leading-7 text-muted-foreground">
            {allDone
              ? "三项分析已经完成。需要时可以单独重跑某一项。"
              : `先完成三项基础分析。当前已完成 ${doneCount} / ${dimensions.length}。`}
          </p>
          {!llmConfigured ? (
            <p className="text-[12px] text-primary">先完成模型设置再开始。</p>
          ) : blockedByGenerating ? (
            <p className="text-[12px] text-primary">当前正在生成，暂不可重新分析。</p>
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
                一键分析三项
              </>
            )}
          </Button>
        ) : null}
      </div>

      <div className="surface-panel divide-y divide-dashed divide-border/60">
        {dimensions.map((dimension) => {
          const item = items[dimension];
          const canShowDetail = Boolean(item.result);
          const statusCopy = getLegacyStatusCopy(item.state);

          return (
            <div key={dimension} className="px-5 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-[15px] font-medium text-foreground">
                      {DIMENSION_LABELS[dimension]}
                    </h3>
                    <span className={cn("font-mono text-[11px]", statusCopy.className)}>
                      {statusCopy.glyph} {statusCopy.label}
                    </span>
                  </div>
                  <p className="max-w-2xl text-[13px] leading-7 text-muted-foreground">
                    {getLegacyDimensionSummary(dimension, item)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="terminal"
                    size="sm"
                    onClick={() => {
                      if (item.state === "done" && typeof window !== "undefined") {
                        const ok = window.confirm(
                          `重新分析「${DIMENSION_LABELS[dimension]}」将消耗 BYOK 配额。继续？`,
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
                        分析中…
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

function ExtendedAnalysisAccordion({
  bookId,
  analyses,
  llmConfigured,
  disabled,
}: ExtendedPanelProps) {
  const router = useRouter();
  const dimensions = EXTENDED_ANALYSIS_DIMENSIONS;
  const initial = useMemo<Record<ExtendedAnalysisDimension, DimensionStatus>>(() => {
    const map = new Map(
      analyses.map((a) => [a.dimension as ExtendedAnalysisDimension, a.result]),
    );
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

  const doneCount = dimensions.filter((d) => items[d].state === "done").length;

  return (
    <section id="extended-analysis-panel" className="space-y-5">
      <div className="space-y-3">
        <p className="eyebrow-label">extended analysis</p>
        <h2 className="font-display text-[28px] italic leading-[1.05] text-foreground">
          扩展分析
        </h2>
        <p className="max-w-2xl text-[14px] leading-7 text-muted-foreground">
          按需启用更深层的写作技法、情感曲线、节奏与悬念分析。这些维度会消耗额外
          token，按需勾选。已完成 {doneCount} / {dimensions.length}。
        </p>
      </div>

      <div className="surface-panel divide-y divide-dashed divide-border/60">
        {dimensions.map((dimension) => {
          const item = items[dimension];
          const canShowDetail = Boolean(item.result);
          const meta = getExtendedStatusCopy(item.state);
          return (
            <div key={dimension} className="px-5 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
                      {`// ${EXTENDED_TOKEN[dimension]}`}
                    </span>
                    <span className={cn("font-mono text-[11px]", meta.className)}>
                      {meta.glyph} {meta.label}
                    </span>
                  </div>
                  <h3 className="font-display text-[20px] italic leading-tight text-foreground">
                    {DIMENSION_LABELS[dimension]}
                  </h3>
                  <p className="max-w-2xl text-[13px] leading-7 text-muted-foreground">
                    {EXTENDED_HELP[dimension]}
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
                          `重新分析「${DIMENSION_LABELS[dimension]}」将消耗 BYOK 配额。继续？`,
                        );
                        if (!ok) return;
                      }
                      void runDimension(dimension);
                    }}
                  >
                    {item.state === "loading" ? (
                      <>
                        <Loader2 className="animate-spin" />
                        分析中…
                      </>
                    ) : item.state === "done" ? (
                      <>
                        <RefreshCw />
                        重新分析
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
