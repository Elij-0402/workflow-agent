"use client";

import { useMemo, useState } from "react";
import { FileText, Sparkles } from "lucide-react";

import type { VariantRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  OUTPUT_SCOPE_LABELS,
  STRATEGY_LABELS,
  STYLE_LABELS,
  VIEWPOINT_LABELS,
} from "./generate-meta";

type VariantListProps = {
  variants: Array<
    Pick<VariantRow, "id" | "title" | "config" | "content" | "word_count" | "created_at">
  >;
};

export function VariantList({ variants }: VariantListProps) {
  const [activeId, setActiveId] = useState(variants[0]?.id ?? "");

  const activeVariant = useMemo(
    () => variants.find((variant) => variant.id === activeId) ?? variants[0],
    [activeId, variants]
  );

  if (variants.length === 0 || !activeVariant) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="eyebrow-label">Results</p>
        <h2 className="mt-2 text-[20px] font-medium tracking-tight text-foreground">
          已生成结果
        </h2>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
          左侧查看版本列表，右侧进入更稳定的长文本阅读区。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="surface-panel overflow-hidden">
          <ScrollArea className="h-[620px]">
            <div className="flex flex-col">
              {variants.map((variant, index) => {
                const active = variant.id === activeVariant.id;
                const preview =
                  variant.content.length > 96
                    ? `${variant.content.slice(0, 96).trim()}…`
                    : variant.content.trim();

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setActiveId(variant.id)}
                    className={`flex flex-col gap-3 px-4 py-4 text-left transition-colors ${
                      index > 0 ? "border-t border-border/70" : ""
                    } ${
                      active ? "bg-accent/55" : "hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {variant.title}
                        </p>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          {formatDate(variant.created_at)}
                        </p>
                      </div>
                      {active ? (
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span>{OUTPUT_SCOPE_LABELS[variant.config.output_scope]}</span>
                      <span>{STRATEGY_LABELS[variant.config.strategy]}</span>
                      <span>{VIEWPOINT_LABELS[variant.config.viewpoint]}</span>
                    </div>

                    <p className="text-[12px] leading-6 text-muted-foreground">
                      {preview || "暂无正文内容。"}
                    </p>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="surface-panel overflow-hidden">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h3 className="text-[18px] font-medium text-foreground">
                  {activeVariant.title}
                </h3>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <ReadingBadge icon={FileText} label={OUTPUT_SCOPE_LABELS[activeVariant.config.output_scope]} />
                  <ReadingBadge icon={Sparkles} label={STRATEGY_LABELS[activeVariant.config.strategy]} />
                  <ReadingBadge label={`创新 ${activeVariant.config.innovation}`} />
                  <ReadingBadge label={VIEWPOINT_LABELS[activeVariant.config.viewpoint]} />
                  <ReadingBadge label={STYLE_LABELS[activeVariant.config.style]} />
                </div>
              </div>

              <div className="text-[12px] text-muted-foreground">
                {activeVariant.word_count?.toLocaleString("zh-CN") ?? "0"} 字
              </div>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_260px]">
            <ScrollArea className="h-[620px]">
              <div className="px-5 py-5">
                <article className="reading-prose max-w-[74ch] whitespace-pre-wrap">
                  {activeVariant.content}
                </article>
              </div>
            </ScrollArea>

            <aside className="border-t border-border/70 bg-background/25 px-5 py-5 xl:border-l xl:border-t-0">
              <div className="flex flex-col gap-4 text-[13px] leading-6 text-muted-foreground">
                <div>
                  <p className="data-label">生成时间</p>
                  <p className="mt-2 text-foreground">{formatDate(activeVariant.created_at)}</p>
                </div>
                <div>
                  <p className="data-label">补充要求</p>
                  <p className="mt-2 text-foreground">
                    {activeVariant.config.extra_instructions.trim() || "默认要求"}
                  </p>
                </div>
                <div>
                  <p className="data-label">阅读说明</p>
                  <p className="mt-2">
                    当前版本以稳定长文本阅读为主，后续会在同一区域接入多版本对照与来源映射。
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReadingBadge({
  icon: Icon,
  label,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/45 px-2.5 py-1">
      {Icon ? <Icon className="h-3 w-3" /> : null}
      <span>{label}</span>
    </span>
  );
}
