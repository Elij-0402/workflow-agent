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
  formatVariantScopeLabel,
  type VariantScope,
} from "./generate-meta";

type VariantCardProps = {
  variant: Pick<
    VariantRow,
    | "id"
    | "title"
    | "config"
    | "content"
    | "word_count"
    | "created_at"
    | "scope"
    | "chapter_index"
  >;
  onDelete?: (id: string) => void;
};

export function VariantCard({ variant, onDelete }: VariantCardProps) {
  const preview =
    variant.content.length > 200
      ? `${variant.content.slice(0, 200).trim()}…`
      : variant.content.trim();
  const scopeLabel = formatVariantScopeLabel(
    variant.scope as VariantScope | null,
    variant.chapter_index,
  );

  return (
    <article className="surface-panel px-6 py-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="eyebrow-label">版本</p>
            <h3 className="font-display text-[20px] italic leading-tight text-foreground">
              {variant.title}
            </h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              {scopeLabel ? (
                <>
                  <span>{scopeLabel}</span>
                  <span className="text-primary/40">·</span>
                </>
              ) : null}
              <span>{OUTPUT_SCOPE_LABELS[variant.config.output_scope]}</span>
              <span className="text-primary/40">·</span>
              <span>{STRATEGY_LABELS[variant.config.strategy]}</span>
              <span className="text-primary/40">·</span>
              <span>创新度 {variant.config.innovation}</span>
              <span className="text-primary/40">·</span>
              <span>{VIEWPOINT_LABELS[variant.config.viewpoint]}</span>
              <span className="text-primary/40">·</span>
              <span>{STYLE_LABELS[variant.config.style]}</span>
            </div>
          </div>

          <div className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground">
            生成于 · {formatDate(variant.created_at)}
          </div>
        </div>

        <p className="max-h-24 overflow-hidden whitespace-pre-wrap text-[13.5px] leading-7 text-muted-foreground">
          {preview || "暂无正文内容。"}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 pt-4">
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
            <span>{variant.word_count?.toLocaleString("zh-CN") ?? "0"} 字</span>
            <span className="text-primary/40">·</span>
            <span>
              {variant.config.extra_instructions.trim()
                ? "含额外要求"
                : "默认要求"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {onDelete ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(variant.id)}
              >
                删除
              </Button>
            ) : null}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  阅读全文 →
                </Button>
              </DialogTrigger>
              <DialogContent className="h-[85vh] max-w-5xl gap-0 overflow-hidden bg-card p-0">
                <DialogHeader className="border-b border-dashed border-border/60 px-6 py-5 text-left">
                  <DialogTitle>{variant.title}</DialogTitle>
                  <DialogDescription className="flex flex-wrap gap-x-3 gap-y-1 pt-2 font-mono text-[10.5px] uppercase tracking-[0.08em]">
                    {scopeLabel ? <span>{scopeLabel}</span> : null}
                    <span>{STRATEGY_LABELS[variant.config.strategy]}</span>
                    <span>创新度 {variant.config.innovation}</span>
                    <span>{VIEWPOINT_LABELS[variant.config.viewpoint]}</span>
                    <span>{STYLE_LABELS[variant.config.style]}</span>
                    <span>
                      {OUTPUT_SCOPE_LABELS[variant.config.output_scope]}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto px-7 pb-7 pt-5">
                  <article className="reading-prose max-w-[78ch] whitespace-pre-wrap">
                    {variant.content}
                  </article>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </article>
  );
}
