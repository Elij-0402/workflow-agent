"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { GenerateForm } from "@/components/sessions/generate-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toastError } from "@/lib/error-toast";
import type { LLMClientError } from "@/lib/llm/errors";
import { GenerateConfigSchema, type GenerateConfig } from "@/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blueprintId: string | null;
  onGenerated: () => void;
};

type GenerateResponse =
  | { ok: true; variantId: string; title: string; wordCount: number }
  | { error: string | LLMClientError };

export function GenerateDrawer({
  open,
  onOpenChange,
  blueprintId,
  onGenerated,
}: Props) {
  const [pending, setPending] = useState(false);
  const form = useForm<GenerateConfig>({
    resolver: zodResolver(GenerateConfigSchema),
    defaultValues: GenerateConfigSchema.parse({}),
  });
  const innovation = form.watch("innovation");

  useEffect(() => {
    if (!open) {
      setPending(false);
      form.reset(GenerateConfigSchema.parse({}));
    }
  }, [open, form]);

  async function onSubmit(values: GenerateConfig) {
    if (!blueprintId) {
      toast.error("请先保存蓝图。");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/generate-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprintId, config: values }),
      });
      const payload = (await res.json()) as GenerateResponse;
      if (!res.ok || !("ok" in payload)) {
        toastError(
          "error" in payload ? payload.error : "生成失败，请稍后重试。",
        );
        return;
      }
      toast.success(`已生成《${payload.title}》`);
      onGenerated();
      onOpenChange(false);
    } catch {
      toastError("生成失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px]"
      >
        <SheetHeader className="border-b border-dashed border-border/60 px-6 py-5">
          <p className="eyebrow-label">generate</p>
          <SheetTitle className="font-display text-[24px] italic leading-tight">
            生成变体参数
          </SheetTitle>
          <SheetDescription>
            常用参数留在首屏；视角、文风、额外要求收进高级选项。
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6">
          <GenerateForm
            form={form}
            pending={pending}
            disabled={false}
            innovation={innovation}
            variantCount={0}
            footerNote=""
            submitLabel="生成新版本"
            advancedToggleClassName="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.10em] text-primary/85 transition-colors hover:text-primary"
            onSubmit={onSubmit}
            footer={
              <div className="flex items-center justify-between gap-3 border-t border-dashed border-border/60 bg-card pt-4">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                  {"// 提交后约 30-60 秒"}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={pending}
                  >
                    取消
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? (
                      <>
                        <Loader2 className="animate-spin" />
                        生成中…
                      </>
                    ) : (
                      <>
                        <Sparkles />
                        生成新版本
                      </>
                    )}
                  </Button>
                </div>
              </div>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
