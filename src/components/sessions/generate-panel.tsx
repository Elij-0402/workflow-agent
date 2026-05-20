"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  GenerateConfigSchema,
  type GenerateConfig,
  type SessionStatus,
} from "@/lib/types";

import {
  AdvancedOptions,
  QuickGenerateForm,
} from "./generate-form-fields";

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
      error: string;
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const form = useForm<GenerateConfig>({
    resolver: zodResolver(GenerateConfigSchema),
    defaultValues: GenerateConfigSchema.parse({}),
  });

  const innovation = form.watch("innovation");
  const isReadyStatus = sessionStatus === "analyzed" || sessionStatus === "done";
  const blockReason = useMemo(() => {
    if (!llmConfigured) {
      return "开始生成前，先完成模型设置。";
    }

    if (!hasCompleteAnalysis) {
      return "请先完成三项分析。";
    }

    if (sessionStatus === "generating") {
      return "当前正在生成，请稍候刷新。";
    }

    if (!isReadyStatus) {
      return "当前任务还不能开始生成。";
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
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pending, startedAt]);

  async function onSubmit(values: GenerateConfig) {
    if (variantCount > 0 && typeof window !== "undefined") {
      const ok = window.confirm(
        `再生成一个版本会再次调用模型并消耗你的 BYOK 配额。当前已有 ${variantCount} 个版本，继续？`
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
        toast.error("error" in payload ? payload.error : "生成失败，请稍后重试。");
        return;
      }

      toast.success(`已生成《${payload.title}》`);
      router.refresh();
    } catch {
      toast.error("生成失败，请稍后重试。");
    } finally {
      setPending(false);
      setStartedAt(null);
    }
  }

  return (
    <section id="generate-panel" className="space-y-5">
      <div className="space-y-3">
        <p className="eyebrow-label">generate</p>
        <h2 className="font-display italic text-[28px] leading-[1.05] text-foreground">
          生成结果
        </h2>
        <p className="max-w-2xl text-[14px] leading-7 text-muted-foreground">
          {variantCount > 0
            ? `当前已保存 ${variantCount} 个版本。保持常用参数在首屏，其余选项收进高级设置。`
            : "先用常用参数生成第一个版本，其他设置按需展开。"}
        </p>
        {blockReason ? (
          <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-primary">
            {`// ${blockReason}`}
          </p>
        ) : null}
        {pending ? (
          <p className="font-mono text-[12px] uppercase tracking-[0.10em] text-primary">
            {`// generating · est 30-60s · elapsed ${elapsedSeconds}s`}
            <span className="blink-cursor" aria-hidden />
          </p>
        ) : null}
      </div>

      <div className="surface-panel p-7">
        <Form {...form}>
          <form
            className="flex flex-col gap-7"
            onSubmit={form.handleSubmit((values) => void onSubmit(values))}
          >
            <QuickGenerateForm
              form={form}
              disabled={pending || Boolean(blockReason)}
              innovation={innovation}
            />

            <div className="border-t border-dashed border-border/60 pt-5">
              <button
                type="button"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.10em] text-primary/85 transition-colors hover:text-primary"
                onClick={() => setShowAdvanced((current) => !current)}
                aria-expanded={showAdvanced}
              >
                {showAdvanced ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {"// advanced options"}
              </button>

              {showAdvanced ? (
                <div className="mt-5">
                  <AdvancedOptions
                    form={form}
                    disabled={pending || Boolean(blockReason)}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-dashed border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                {variantCount > 0
                  ? "// new run appends — never overwrites"
                  : "// result saves to current session"}
              </p>
              <Button
                type="submit"
                disabled={pending || Boolean(blockReason)}
              >
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    生成中…
                  </>
                ) : (
                  <>
                    <Sparkles />
                    {variantCount > 0 ? "再生成一版" : "生成变体"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </section>
  );
}
