"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { VariantRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  OUTPUT_SCOPE_LABELS,
  STRATEGY_LABELS,
  STYLE_LABELS,
  VIEWPOINT_LABELS,
} from "./generate-meta";

type VariantCardProps = {
  variant: Pick<
    VariantRow,
    "id" | "title" | "config" | "content" | "word_count" | "created_at"
  >;
};

export function VariantCard({ variant }: VariantCardProps) {
  const preview =
    variant.content.length > 200
      ? `${variant.content.slice(0, 200).trim()}…`
      : variant.content.trim();

  return (
    <article className="rounded-lg border border-border/60 bg-card/40 px-5 py-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h3 className="text-[18px] font-medium text-foreground">
              {variant.title}
            </h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
              <span>{OUTPUT_SCOPE_LABELS[variant.config.output_scope]}</span>
              <span>{STRATEGY_LABELS[variant.config.strategy]}</span>
              <span>创新 {variant.config.innovation}</span>
              <span>{VIEWPOINT_LABELS[variant.config.viewpoint]}</span>
              <span>{STYLE_LABELS[variant.config.style]}</span>
            </div>
          </div>

          <div className="text-[12px] text-muted-foreground">
            生成于 {formatDate(variant.created_at)}
          </div>
        </div>

        <p className="max-h-24 overflow-hidden whitespace-pre-wrap text-[13px] leading-6 text-muted-foreground">
          {preview || "暂无正文内容。"}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span>{variant.word_count?.toLocaleString("zh-CN") ?? "0"} 字</span>
            {variant.config.extra_instructions.trim() ? (
              <span>含补充要求</span>
            ) : (
              <span>默认要求</span>
            )}
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                阅读全文
              </Button>
            </DialogTrigger>
            <DialogContent className="h-[85vh] max-w-5xl gap-0 overflow-hidden border-border/70 bg-background p-0">
              <DialogHeader className="border-b border-border/60 px-6 py-5 text-left">
                <DialogTitle>{variant.title}</DialogTitle>
                <DialogDescription className="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-[12px]">
                  <span>{STRATEGY_LABELS[variant.config.strategy]}</span>
                  <span>创新 {variant.config.innovation}</span>
                  <span>{VIEWPOINT_LABELS[variant.config.viewpoint]}</span>
                  <span>{STYLE_LABELS[variant.config.style]}</span>
                  <span>{OUTPUT_SCOPE_LABELS[variant.config.output_scope]}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-y-auto px-6 pb-6 pt-5">
                <pre className="whitespace-pre-wrap font-mono text-[13px] leading-7 text-foreground">
                  {variant.content}
                </pre>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </article>
  );
}
