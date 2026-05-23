"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
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
  const form = useForm<GenerateConfig>({
    resolver: zodResolver(GenerateConfigSchema),
    defaultValues: GenerateConfigSchema.parse({}),
  });

  const outputScope = form.watch("output_scope");
  const innovation = form.watch("innovation");
  const isReadyStatus = sessionStatus === "analyzed" || sessionStatus === "done";
  const blockReason = useMemo(() => {
    if (!llmConfigured) {
      return "请先在设置页保存 LLM 配置，再开始生成变体。";
    }

    if (!hasCompleteAnalysis) {
      return "请先完成三维度分析。";
    }

    if (sessionStatus === "generating") {
      return "当前会话正在生成变体，请稍候刷新。";
    }

    if (!isReadyStatus) {
      return "当前会话还不能生成变体。";
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
    <section>
      <Card className="border-border/60 bg-card/35 shadow-none">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>生成变体</CardTitle>
                  <CardDescription className="mt-1">
                    {variantCount > 0
                      ? `已生成 ${variantCount} 个变体，可继续追加新的版本。`
                      : "基于分析结果与原书片段生成新的正文变体。"}
                  </CardDescription>
                </div>
              </div>
            </div>
            <Badge variant="outline">
              {
                OUTPUT_SCOPE_OPTIONS.find((option) => option.value === outputScope)
                  ?.hint
              }
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {blockReason ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] leading-6 text-amber-100">
              {blockReason}
            </div>
          ) : null}

          {pending ? (
            <div className="rounded-lg border border-border/60 bg-background/35 px-4 py-3 text-[13px] leading-6 text-muted-foreground">
              预计 30-60 秒，已等待 {elapsedSeconds} 秒。生成完成后会自动刷新列表。
            </div>
          ) : null}

          <Form {...form}>
            <form
              className="space-y-5"
              onSubmit={form.handleSubmit((values) => void onSubmit(values))}
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="strategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>变体策略</FormLabel>
                      <Select
                        disabled={pending || Boolean(blockReason)}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择变体策略" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {STRATEGY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {
                          STRATEGY_OPTIONS.find((option) => option.value === field.value)
                            ?.description
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="output_scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>输出范围</FormLabel>
                      <Select
                        disabled={pending || Boolean(blockReason)}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择输出范围" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OUTPUT_SCOPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {
                          OUTPUT_SCOPE_OPTIONS.find(
                            (option) => option.value === field.value
                          )?.description
                        }
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="viewpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>叙事视角</FormLabel>
                      <Select
                        disabled={pending || Boolean(blockReason)}
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
                        disabled={pending || Boolean(blockReason)}
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
                name="innovation"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-3">
                      <FormLabel>创新强度</FormLabel>
                      <Badge variant="secondary">创新 {innovation}</Badge>
                    </div>
                    <FormControl>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={field.value}
                        disabled={pending || Boolean(blockReason)}
                        className="w-full accent-primary"
                        onChange={(event) =>
                          field.onChange(Number(event.target.value))
                        }
                      />
                    </FormControl>
                    <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                      <span>更稳妥</span>
                      <span>更激进</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extra_instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>附加要求</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={pending || Boolean(blockReason)}
                        className="min-h-[120px] resize-y"
                        placeholder="例如：把主角的主动性写得更强，减少解释性旁白。"
                      />
                    </FormControl>
                    <FormDescription>
                      可留空。适合补充风格、主题、角色侧重点等要求。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-muted-foreground">
                  生成会使用当前会话的三维度分析结果与原文片段，不会修改已有分析记录。
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
                      生成变体
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </section>
  );
}
