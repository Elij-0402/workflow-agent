"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AnalysisDetail } from "@/components/sessions/analysis-detail";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ANALYSIS_DIMENSIONS,
  DIMENSION_LABELS,
  type AnalysisDimension,
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
};

type DimensionStatus = {
  state: AnalysisState;
  result?: unknown;
};

function summarizeResult(dimension: AnalysisDimension, result: unknown) {
  if (!result || typeof result !== "object") {
    return "暂无结果。";
  }

  const data = result as Record<string, unknown>;

  switch (dimension) {
    case "worldview":
      return String(data.summary ?? "已生成世界观分析结果。");
    case "characters":
      return String(data.summary ?? "已生成人物分析结果。");
    case "narrative":
      return String(data.summary ?? "已生成叙事分析结果。");
    default:
      return "分析已完成。";
  }
}

export function AnalysisPanel({
  sessionId,
  analyses,
  llmConfigured,
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

  async function runDimension(dimension: AnalysisDimension) {
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
      router.refresh();
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
    await Promise.allSettled(ANALYSIS_DIMENSIONS.map((dimension) => runDimension(dimension)));
  }

  const hasLoading = ANALYSIS_DIMENSIONS.some(
    (dimension) => items[dimension].state === "loading"
  );

  const allDone = ANALYSIS_DIMENSIONS.every(
    (dimension) => items[dimension].state === "done"
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[18px] font-medium text-foreground">三维度分析</h2>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            世界观、人物、叙事三个维度会并发执行。失败维度可单独重试。
          </p>
        </div>
        <Button onClick={runAll} disabled={!llmConfigured || hasLoading || allDone}>
          {hasLoading ? (
            <>
              <Loader2 className="animate-spin" />
              分析中
            </>
          ) : (
            <>
              <Sparkles />
              {allDone ? "分析已完成" : "开始分析"}
            </>
          )}
        </Button>
      </div>

      {!llmConfigured ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100">
          当前还没有可用的模型配置。请先到设置页保存 LLM 配置，再开始分析。
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {ANALYSIS_DIMENSIONS.map((dimension) => {
          const item = items[dimension];
          const canShowDetail = Boolean(item.result);

          return (
            <Card
              key={dimension}
              className="border-border/60 bg-card/35 shadow-none"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-[16px]">
                    {DIMENSION_LABELS[dimension]}
                  </CardTitle>
                  <StatusBadge state={item.state} />
                </div>
                <CardDescription>
                  {item.state === "done"
                    ? "结果已保存，可直接继续下一步。"
                    : "基于上传文本前约 8 万字符生成结构化结果。"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="min-h-28 rounded-lg border border-border/60 bg-background/30 p-3 text-[13px] leading-6 text-muted-foreground">
                  {item.state === "loading" ? (
                    <div className="flex items-center gap-2 text-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在生成 {DIMENSION_LABELS[dimension]} 分析...
                    </div>
                  ) : item.state === "error" ? (
                    item.result ? (
                      <p className="text-foreground">
                        重新分析失败，当前仍保留上次结果。请稍后重试。
                      </p>
                    ) : (
                      "本维度分析失败，请重试。已有成功维度不会受影响。"
                    )
                  ) : item.state === "done" ? (
                    <p className="text-foreground">
                      {summarizeResult(dimension, item.result)}
                    </p>
                  ) : (
                    "尚未开始分析。"
                  )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant={item.state === "done" ? "outline" : "default"}
                    className="flex-1"
                    onClick={() => void runDimension(dimension)}
                    disabled={!llmConfigured || item.state === "loading"}
                  >
                    {item.state === "loading" ? (
                      <>
                        <Loader2 className="animate-spin" />
                        处理中
                      </>
                    ) : item.state === "done" ? (
                      <>
                        <RefreshCw />
                        重新分析
                      </>
                    ) : item.state === "error" ? (
                      <>
                        <RefreshCw />
                        重试分析
                      </>
                    ) : (
                      "分析此维度"
                    )}
                  </Button>

                  {canShowDetail ? (
                    <Button
                      variant="ghost"
                      className="sm:w-auto"
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
                          展开详情
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>

                {canShowDetail && expanded[dimension] ? (
                  <>
                    <Separator className="bg-border/60" />
                    <AnalysisDetail dimension={dimension} result={item.result} />
                  </>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function StatusBadge({ state }: { state: AnalysisState }) {
  if (state === "done") {
    return <Badge variant="success">已完成</Badge>;
  }

  if (state === "loading") {
    return <Badge variant="secondary">分析中</Badge>;
  }

  if (state === "error") {
    return <Badge variant="destructive">失败</Badge>;
  }

  return <Badge variant="outline">待开始</Badge>;
}
