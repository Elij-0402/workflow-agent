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
    [activeId, variants],
  );

  if (variants.length === 0 || !activeVariant) {
    return null;
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="eyebrow-label">results</p>
        <h2 className="mt-2 font-display text-[28px] italic leading-[1.05] text-foreground">
          已生成结果
        </h2>
        <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">
          左侧查看版本列表，右侧进入更稳定的长文本阅读区。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="surface-panel overflow-hidden">
          <div className="border-b border-dashed border-border/70 px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
            {`// variants · ${variants.length}`}
          </div>
          <ScrollArea className="h-[620px]">
            <div className="flex flex-col divide-y divide-dashed divide-border/40">
              {variants.map((variant, index) => {
                const active = variant.id === activeVariant.id;
                const preview =
                  variant.content.length > 96
                    ? `${variant.content.slice(0, 96).trim()}…`
                    : variant.content.trim();
                const versionTag = `v.${String(variants.length - index).padStart(3, "0")}`;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setActiveId(variant.id)}
                    className={`relative flex flex-col gap-3 px-4 py-4 text-left transition-colors ${
                      active ? "bg-accent/60" : "hover:bg-accent/30"
                    }`}
                  >
                    {active ? (
                      <span
                        className="absolute bottom-3 left-0 top-3 w-[2px] bg-primary"
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/80">
                          {versionTag}
                        </p>
                        <p className="mt-1 truncate font-display text-[16px] italic text-foreground">
                          {variant.title}
                        </p>
                        <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                          {formatDate(variant.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                      <span className="rounded-[1.5px] border border-border bg-muted/60 px-1.5 py-0.5">
                        {OUTPUT_SCOPE_LABELS[variant.config.output_scope]}
                      </span>
                      <span className="rounded-[1.5px] border border-border bg-muted/60 px-1.5 py-0.5">
                        {STRATEGY_LABELS[variant.config.strategy]}
                      </span>
                      <span className="rounded-[1.5px] border border-border bg-muted/60 px-1.5 py-0.5">
                        {VIEWPOINT_LABELS[variant.config.viewpoint]}
                      </span>
                    </div>

                    <p className="line-clamp-3 text-[12.5px] leading-6 text-muted-foreground">
                      {preview || "暂无正文内容。"}
                    </p>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="surface-panel overflow-hidden">
          <div className="border-b border-dashed border-border/70 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="eyebrow-label">reader</p>
                <h3 className="mt-1.5 font-display text-[24px] italic leading-tight text-foreground">
                  {activeVariant.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                  <ReadingBadge
                    icon={FileText}
                    label={OUTPUT_SCOPE_LABELS[activeVariant.config.output_scope]}
                  />
                  <ReadingBadge
                    icon={Sparkles}
                    label={STRATEGY_LABELS[activeVariant.config.strategy]}
                  />
                  <ReadingBadge label={`innov ${activeVariant.config.innovation}`} />
                  <ReadingBadge label={VIEWPOINT_LABELS[activeVariant.config.viewpoint]} />
                  <ReadingBadge label={STYLE_LABELS[activeVariant.config.style]} />
                </div>
              </div>

              <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-primary/85">
                {activeVariant.word_count?.toLocaleString("zh-CN") ?? "0"} 字
              </div>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">
            <ScrollArea className="h-[620px]">
              <div className="px-7 py-7">
                <article className="reading-prose max-w-[74ch] whitespace-pre-wrap">
                  {activeVariant.content}
                </article>
              </div>
            </ScrollArea>

            <aside className="border-t border-dashed border-border/70 bg-background/30 px-5 py-5 xl:border-l xl:border-t-0">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="data-label">{"// generated"}</p>
                  <p className="mt-2 font-mono text-[12px] text-foreground">
                    {formatDate(activeVariant.created_at)}
                  </p>
                </div>
                <div>
                  <p className="data-label">{"// extra instructions"}</p>
                  <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
                    {activeVariant.config.extra_instructions.trim() || "默认要求"}
                  </p>
                </div>
                <div>
                  <p className="data-label">{"// reader notes"}</p>
                  <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
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
    <span className="inline-flex items-center gap-1 rounded-[1.5px] border border-border bg-background/40 px-1.5 py-0.5">
      {Icon ? <Icon className="h-3 w-3 text-primary/70" /> : null}
      <span>{label}</span>
    </span>
  );
}
