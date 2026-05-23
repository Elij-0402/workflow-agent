"use client";

import { useState } from "react";

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

export function VariantComparison({ variants, confirmedAt }: Props) {
  const [leftId, setLeftId] = useState(variants[0]?.id ?? "");
  const [rightId, setRightId] = useState(
    variants[1]?.id ?? variants[0]?.id ?? ""
  );
  const left = variants.find((v) => v.id === leftId);
  const right = variants.find((v) => v.id === rightId);

  if (!left || !right) {
    return (
      <p className="text-[13px] text-muted-foreground">
        至少生成 2 个变体才能进入比较。
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium">结果对比</h2>
        <div className="flex gap-3 text-[13px]">
          <Picker
            label="左"
            value={leftId}
            options={variants}
            confirmedAt={confirmedAt}
            onChange={setLeftId}
          />
          <Picker
            label="右"
            value={rightId}
            options={variants}
            confirmedAt={confirmedAt}
            onChange={setRightId}
          />
        </div>
      </header>
      <Card title="元信息">
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
      </Card>
      <Card title="章节结构">
        <VariantDiffStructure left={left.content} right={right.content} />
      </Card>
      <Card title="关键段落">
        <VariantDiffParagraphs left={left.content} right={right.content} />
      </Card>
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
      <span className="text-muted-foreground">{label}</span>
      <select
        className="rounded-[6px] border border-border/60 bg-background/40 px-2 py-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((v) => {
          const stale = isStale(v, confirmedAt);
          return (
            <option key={v.id} value={v.id}>
              {v.title}
              {stale ? "（旧蓝图）" : ""}
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-panel p-3">
      <h3 className="mb-2 text-[13px] font-medium">{title}</h3>
      {children}
    </div>
  );
}
