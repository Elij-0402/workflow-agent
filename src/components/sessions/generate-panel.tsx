"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  GenerateConfigSchema,
  type GenerateConfig,
  type SessionStatus,
} from "@/lib/types";
import {
  OUTPUT_SCOPE_OPTIONS,
  STRATEGY_OPTIONS,
  STYLE_OPTIONS,
  VIEWPOINT_OPTIONS,
} from "./generate-meta";

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
      <div className="space-y-2">
        <h2 className="text-[20px] font-medium tracking-tight text-foreground">
          生成结果
        </h2>
        <p className="max-w-2xl text-[14px] leading-6 text-muted-foreground">
          {variantCount > 0
            ? `当前已保存 ${variantCount} 个版本。保持常用参数在首屏，其余选项收进高级设置。`
            : "先用常用参数生成第一个版本，其他设置按需展开。"}
        </p>
        {blockReason ? (
          <p className="text-[13px] leading-6 text-amber-200">{blockReason}</p>
        ) : null}
        {pending ? (
          <p className="text-[13px] leading-6 text-muted-foreground">
            预计 30 到 60 秒，已等待 {elapsedSeconds} 秒。
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-border/60 bg-card/40 p-6">
        <Form {...form}>
          <form
            className="space-y-6"
            onSubmit={form.handleSubmit((values) => void onSubmit(values))}
          >
            <QuickGenerateForm
              form={form}
              disabled={pending || Boolean(blockReason)}
              innovation={innovation}
            />

            <div className="border-t border-border/60 pt-5">
              <button
                type="button"
                className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowAdvanced((current) => !current)}
                aria-expanded={showAdvanced}
              >
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                高级选项
              </button>

              {showAdvanced ? (
                <div className="mt-4">
                  <AdvancedOptions
                    form={form}
                    disabled={pending || Boolean(blockReason)}
                  />
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-muted-foreground">
                {variantCount > 0
                  ? "新结果会追加保存，不会覆盖现有版本。"
                  : "生成后结果会保存在当前任务下。"}
              </p>
              <Button type="submit" disabled={pending || Boolean(blockReason)}>
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    生成中
                  </>
                ) : (
                  <>
                    <Sparkles />
                    {variantCount > 0 ? "再生成一个版本" : "生成结果"}
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

function QuickGenerateForm({
  form,
  disabled,
  innovation,
}: {
  form: UseFormReturn<GenerateConfig>;
  disabled: boolean;
  innovation: number;
}) {
  const strategy = form.watch("strategy");
  const outputScope = form.watch("output_scope");

  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="output_scope"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>结果范围</FormLabel>
            <ChoiceGrid
              options={OUTPUT_SCOPE_OPTIONS}
              value={field.value}
              disabled={disabled}
              onChange={field.onChange}
            />
            <p className="text-[13px] leading-6 text-muted-foreground">
              {
                OUTPUT_SCOPE_OPTIONS.find((option) => option.value === outputScope)
                  ?.description
              }
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="strategy"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>改写方式</FormLabel>
            <ChoiceGrid
              options={STRATEGY_OPTIONS}
              value={field.value}
              disabled={disabled}
              onChange={field.onChange}
            />
            <p className="text-[13px] leading-6 text-muted-foreground">
              {
                STRATEGY_OPTIONS.find((option) => option.value === strategy)
                  ?.description
              }
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="innovation"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <FormLabel>创新强度</FormLabel>
              <span className="text-[13px] text-foreground">{innovation} / 10</span>
            </div>
            <FormControl>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={field.value}
                disabled={disabled}
                className="w-full accent-primary"
                onChange={(event) =>
                  field.onChange(Number(event.target.value))
                }
              />
            </FormControl>
            <div className="flex items-center justify-between text-[12px] text-muted-foreground">
              <span>更稳</span>
              <span>更大胆</span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function AdvancedOptions({
  form,
  disabled,
}: {
  form: UseFormReturn<GenerateConfig>;
  disabled: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <FormField
          control={form.control}
          name="viewpoint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>叙事视角</FormLabel>
              <Select
                disabled={disabled}
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择叙事视角" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VIEWPOINT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="style"
          render={({ field }) => (
            <FormItem>
              <FormLabel>文风倾向</FormLabel>
              <Select
                disabled={disabled}
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择文风倾向" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="extra_instructions"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Settings2 className="h-4 w-4" />
              <FormLabel>补充要求</FormLabel>
            </div>
            <FormControl>
              <Textarea
                {...field}
                disabled={disabled}
                className="min-h-[120px] resize-y"
                placeholder="例如：强化主角主动性，减少解释性旁白。"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function ChoiceGrid<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: Array<{
    value: T;
    label: string;
  }>;
  value: T;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            className={cn(
              "rounded-lg border px-3 py-3 text-left text-[13px] transition-colors",
              active
                ? "border-primary/50 bg-primary/10 text-foreground"
                : "border-border/60 bg-background/20 text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(option.value)}
          >
            <span className="font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
