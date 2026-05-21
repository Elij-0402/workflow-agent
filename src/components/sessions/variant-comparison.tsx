"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { VariantDiffMeta } from "./variant-diff-meta";
import { VariantDiffParagraphs } from "./variant-diff-paragraphs";
import { VariantDiffStructure } from "./variant-diff-structure";

type Variant = {
  id: string;
  title: string;
  content: string;
  word_count: number | null;
  config: Record<string, unknown>;
  blueprint_id: string | null;
  created_at: string;
};

type Props = {
  variants: Variant[];
  confirmedAt: string | null;
};

type DiffTab = "meta" | "structure" | "paragraphs";

const TABS: Array<{ key: DiffTab; label: string }> = [
  { key: "structure", label: "章节结构" },
  { key: "meta", label: "元信息" },
  { key: "paragraphs", label: "段落差异" },
];

const TAB_STORAGE_KEY = "wb-diff-tab";

export function VariantComparison({ variants, confirmedAt }: Props) {
  const [leftId, setLeftId] = useState(variants[0]?.id ?? "");
  const [rightId, setRightId] = useState(variants[1]?.id ?? variants[0]?.id ?? "");
  const [tab, setTab] = useState<DiffTab>("structure");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (stored === "meta" || stored === "structure" || stored === "paragraphs") {
        setTab(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function changeTab(next: DiffTab) {
    setTab(next);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function swap() {
    setLeftId(rightId);
    setRightId(leftId);
  }

  const left = variants.find((v) => v.id === leftId);
  const right = variants.find((v) => v.id === rightId);

  if (!left || !right) {
    return (
      <div className="surface-panel p-6">
        <p className="text-[13px] leading-7 text-muted-foreground">
          至少需要 2 个变体才能开始对比。
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-[18px] font-medium leading-tight text-foreground">结果对比</h2>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <Picker
            label="A"
            value={leftId}
            options={variants}
            confirmedAt={confirmedAt}
            onChange={setLeftId}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={swap}
            aria-label="交换 A/B 变体"
            title="交换 A 与 B"
          >
            <ArrowLeftRight aria-hidden className="h-3.5 w-3.5" />
          </Button>
          <Picker
            label="B"
            value={rightId}
            options={variants}
            confirmedAt={confirmedAt}
            onChange={setRightId}
          />
        </div>
      </header>

      <div
        className="surface-subtle inline-flex items-center gap-0.5 px-1.5 py-1"
        role="tablist"
        aria-label="差异维度切换"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            data-active={tab === t.key}
            onClick={() => changeTab(t.key)}
            className="rounded-[2px] px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:text-foreground data-[active=true]:bg-background data-[active=true]:text-foreground"
            aria-selected={tab === t.key}
            aria-label={`查看${t.label}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="surface-panel p-4">
        {tab === "meta" ? (
          <VariantDiffMeta
            left={{
              title: left.title,
              wordCount: left.word_count ?? 0,
              ...left.config,
            }}
            right={{
              title: right.title,
              wordCount: right.word_count ?? 0,
              ...right.config,
            }}
          />
        ) : tab === "structure" ? (
          <VariantDiffStructure left={left.content} right={right.content} />
        ) : (
          <VariantDiffParagraphs left={left.content} right={right.content} />
        )}
      </div>
    </section>
  );
}

function Picker({
  label,
  value,
  options,
  confirmedAt,
  onChange,
}: {
  label: string;
  value: string;
  options: Variant[];
  confirmedAt: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-[0.10em] text-muted-foreground">{label}</span>
      <select
        className="h-8 rounded-[3px] border border-border bg-background/40 px-2 text-[12px] text-foreground transition-colors focus:border-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
        style={{ transitionDuration: "var(--duration-fast)" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`选择变体 ${label}`}
      >
        {options.map((v) => {
          const stale = isStale(v, confirmedAt);
          return (
            <option key={v.id} value={v.id}>
              {v.title}
              {stale ? " · (旧)" : ""}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function isStale(v: Variant, confirmedAt: string | null) {
  if (!confirmedAt) return false;
  return new Date(v.created_at).getTime() < new Date(confirmedAt).getTime();
}
