"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownAZ,
  ArrowUpDown,
  Clock,
  FileText,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { VariantRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toolbar } from "@/components/ui/toolbar";
import {
  OUTPUT_SCOPE_LABELS,
  STRATEGY_LABELS,
  STYLE_LABELS,
  VIEWPOINT_LABELS,
  formatVariantScopeLabel,
  type VariantScope,
} from "./generate-meta";

type VariantSlim = Pick<
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

type VariantListProps = {
  variants: VariantSlim[];
};

type SortKey = "created_at" | "word_count";

const TOOLBAR_THRESHOLD = 10;

export function VariantList({ variants: initialVariants }: VariantListProps) {
  const router = useRouter();
  const [variants, setVariants] = useState(initialVariants);
  const [activeId, setActiveId] = useState(initialVariants[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? variants.filter((v) => v.title.toLowerCase().includes(q))
      : variants;
    const sorted = [...matched].sort((a, b) => {
      if (sortKey === "word_count") {
        return (b.word_count ?? 0) - (a.word_count ?? 0);
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    return sorted;
  }, [variants, query, sortKey]);

  const activeVariant = useMemo(
    () =>
      filtered.find((variant) => variant.id === activeId) ??
      filtered[0] ??
      variants[0],
    [activeId, filtered, variants],
  );

  const handleDelete = (id: string) => {
    if (!window.confirm("确定删除这个版本吗？此操作无法撤销。")) return;
    startTransition(async () => {
      const res = await fetch(`/api/variants/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        toast.error((json as { error?: string }).error ?? "删除失败。");
        return;
      }
      setVariants((current) => current.filter((variant) => variant.id !== id));
      toast.success("版本已删除。");
      router.refresh();
    });
  };

  if (variants.length === 0 || !activeVariant) {
    return null;
  }

  const showToolbar = variants.length > TOOLBAR_THRESHOLD;

  return (
    <section
      className={`space-y-5 ${pending ? "pointer-events-none opacity-60" : ""}`}
    >
      <div>
        <p className="eyebrow-label">结果</p>
        <h2 className="mt-2 font-display text-[28px] italic leading-[1.05] text-foreground">
          已生成结果
        </h2>
        <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">
          左侧查看版本列表，右侧进入更稳定的长文本阅读区。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="surface-panel flex flex-col overflow-hidden">
          {showToolbar ? (
            <div className="px-4 pt-3">
              <Toolbar
                searchValue={query}
                onSearchChange={setQuery}
                searchPlaceholder="搜索版本标题…"
                sort={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xs border border-border/60 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() =>
                      setSortKey((current) =>
                        current === "created_at" ? "word_count" : "created_at",
                      )
                    }
                    aria-label="切换排序"
                  >
                    {sortKey === "created_at" ? (
                      <Clock className="h-3 w-3" aria-hidden />
                    ) : (
                      <ArrowDownAZ className="h-3 w-3" aria-hidden />
                    )}
                    {sortKey === "created_at" ? "按时间" : "按字数"}
                    <ArrowUpDown className="h-3 w-3 opacity-50" aria-hidden />
                  </button>
                }
                count={`${filtered.length} / ${variants.length}`}
              />
            </div>
          ) : (
            <div className="border-b border-border/40 px-4 py-2.5 text-[12px] text-primary/80">
              {`版本数：${variants.length}`}
            </div>
          )}
          <ScrollArea className="max-h-[620px] min-h-[280px] flex-1">
            <div className="flex flex-col divide-y divide-border/20">
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">
                  没有匹配的版本。
                </p>
              ) : (
                filtered.map((variant, index) => {
                  const active = variant.id === activeVariant.id;
                  const preview =
                    variant.content.length > 96
                      ? `${variant.content.slice(0, 96).trim()}…`
                      : variant.content.trim();
                  const versionTag = `v.${String(filtered.length - index).padStart(3, "0")}`;
                  const scopeLabel = formatVariantScopeLabel(
                    variant.scope as VariantScope | null,
                    variant.chapter_index,
                  );

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
                        {scopeLabel ? (
                          <span className="rounded-xs border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-primary">
                            {scopeLabel}
                          </span>
                        ) : null}
                        <span className="rounded-xs border border-border bg-muted/60 px-1.5 py-0.5">
                          {OUTPUT_SCOPE_LABELS[variant.config.output_scope]}
                        </span>
                        <span className="rounded-xs border border-border bg-muted/60 px-1.5 py-0.5">
                          {STRATEGY_LABELS[variant.config.strategy]}
                        </span>
                        <span className="rounded-xs border border-border bg-muted/60 px-1.5 py-0.5">
                          {VIEWPOINT_LABELS[variant.config.viewpoint]}
                        </span>
                      </div>

                      <p className="line-clamp-3 text-[12.5px] leading-6 text-muted-foreground">
                        {preview || "暂无正文内容。"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="surface-panel overflow-hidden">
          <div className="border-b border-border/40 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="eyebrow-label">阅读区</p>
                <h3 className="mt-1.5 font-display text-[24px] italic leading-tight text-foreground">
                  {activeVariant.title}
                </h3>
                <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                  {formatVariantScopeLabel(
                    activeVariant.scope as VariantScope | null,
                    activeVariant.chapter_index,
                  ) ? (
                    <ReadingBadge
                      label={
                        formatVariantScopeLabel(
                          activeVariant.scope as VariantScope | null,
                          activeVariant.chapter_index,
                        )!
                      }
                    />
                  ) : null}
                  <ReadingBadge
                    icon={FileText}
                    label={
                      OUTPUT_SCOPE_LABELS[activeVariant.config.output_scope]
                    }
                  />
                  <ReadingBadge
                    icon={Sparkles}
                    label={STRATEGY_LABELS[activeVariant.config.strategy]}
                  />
                  <ReadingBadge
                    label={`innov ${activeVariant.config.innovation}`}
                  />
                  <ReadingBadge
                    label={VIEWPOINT_LABELS[activeVariant.config.viewpoint]}
                  />
                  <ReadingBadge
                    label={STYLE_LABELS[activeVariant.config.style]}
                  />
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="font-mono text-[11px] uppercase tracking-[0.10em] text-primary/85">
                  {activeVariant.word_count?.toLocaleString("zh-CN") ?? "0"} 字
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(activeVariant.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除版本
                </Button>
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

            <aside className="border-t border-border/40 bg-background/30 px-5 py-5 xl:border-l xl:border-t-0">
              <div className="flex flex-col gap-5">
                <div>
                  <p className="data-label">生成时间</p>
                  <p className="mt-2 font-mono text-[12px] text-foreground">
                    {formatDate(activeVariant.created_at)}
                  </p>
                </div>
                <div>
                  <p className="data-label">额外要求</p>
                  <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
                    {activeVariant.config.extra_instructions.trim() ||
                      "默认要求"}
                  </p>
                </div>
                <div>
                  <p className="data-label">阅读提示</p>
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
    <span className="inline-flex items-center gap-1 rounded-xs border border-border bg-background/40 px-1.5 py-0.5">
      {Icon ? <Icon className="h-3 w-3 text-primary/70" /> : null}
      <span>{label}</span>
    </span>
  );
}
