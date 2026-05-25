"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { toastError } from "@/lib/error-toast";
import type { LLMClientError } from "@/lib/llm/errors";
import {
  GenerateConfigSchema,
  type GenerateConfig,
  type SessionStatus,
} from "@/lib/types";

import { GenerateForm } from "./generate-form";

type GeneratePanelProps = {
  sessionId: string;
  sessionStatus: SessionStatus;
  llmConfigured: boolean;
  hasCompleteAnalysis: boolean;
  variantCount: number;
};

type GenerateResponse =
  | {
      ok: true;
      variantId: string;
      title: string;
      wordCount: number;
    }
  | {
      error: string | LLMClientError;
    };

export function GeneratePanel({
  sessionId,
  sessionStatus,
  llmConfigured,
  hasCompleteAnalysis,
  variantCount,
}: GeneratePanelProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const form = useForm<GenerateConfig>({
    resolver: zodResolver(GenerateConfigSchema),
    defaultValues: GenerateConfigSchema.parse({}),
  });

  const innovation = form.watch("innovation");
  const isReadyStatus =
    sessionStatus === "analyzed" || sessionStatus === "done";
  const blockReason = useMemo(() => {
    if (!llmConfigured) {
      return "需先配置模型";
    }

    if (!hasCompleteAnalysis) {
      return "完成三项分析后可生成";
    }

    if (sessionStatus === "generating") {
      return "正在生成，稍后刷新";
    }

    if (!isReadyStatus) {
      return "任务暂不可生成";
    }

    return null;
  }, [hasCompleteAnalysis, isReadyStatus, llmConfigured, sessionStatus]);

  useEffect(() => {
    if (!pending || startedAt == null) {
      setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    const timer = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pending, startedAt]);

  async function onSubmit(values: GenerateConfig) {
    if (variantCount > 0 && typeof window !== "undefined") {
      const ok = window.confirm(
        `生成新版本将消耗 BYOK 配额。已有 ${variantCount} 个版本，继续？`,
      );
      if (!ok) return;
    }

    setPending(true);
    setStartedAt(Date.now());

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          config: values,
        }),
      });

      const payload = (await response.json()) as GenerateResponse;

      if (!response.ok || !("ok" in payload)) {
        toastError(
          "error" in payload ? payload.error : "生成失败，请稍后重试。",
        );
        return;
      }

      toast.success(`已生成《${payload.title}》`);
      router.refresh();
    } catch {
      toastError("生成失败，请稍后重试。");
    } finally {
      setPending(false);
      setStartedAt(null);
    }
  }

  return (
    <section id="generate-panel" className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-[20px] font-medium leading-tight text-foreground">
          生成结果
        </h2>
        <p className="max-w-2xl text-[13px] leading-7 text-muted-foreground">
          {variantCount > 0
            ? `当前已保存 ${variantCount} 个版本。常用参数在首屏，其余收进高级设置。`
            : "先用常用参数生成第一个版本，其他设置按需展开。"}
        </p>
        {blockReason ? (
          <p className="text-[12px] text-primary">{blockReason}</p>
        ) : null}
        {pending ? (
          <p className="font-mono text-[12px] text-primary">
            生成中 · 预计 30-60s · 已用 {elapsedSeconds}s
          </p>
        ) : null}
      </div>

      <div className="surface-panel p-7">
        <GenerateForm
          form={form}
          pending={pending}
          disabled={Boolean(blockReason)}
          innovation={innovation}
          variantCount={variantCount}
          footerNote={
            variantCount > 0
              ? "每次生成会追加新版本，不会覆盖旧版本。"
              : "结果会保存到当前任务。"
          }
          submitLabel={variantCount > 0 ? "再生成一版" : "生成变体"}
          onSubmit={onSubmit}
        />
      </div>
    </section>
  );
}
