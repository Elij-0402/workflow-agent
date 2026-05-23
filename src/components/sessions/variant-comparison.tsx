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
  const [rightId, setRightId] = useState(variants[1]?.id ?? variants[0]?.id ?? "");
  const left = variants.find((v) => v.id === leftId);
  const right = variants.find((v) => v.id === rightId);

  if (!left || !right) {
    return (
      <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
        {"// 至少生成 2 个变体才能进入比较"}
      </p>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow-label">compare variants</p>
          <h2 className="mt-2 font-display text-[24px] italic leading-tight text-foreground">
            结果对比
          </h2>
        </div>
        <div className="flex flex-wrap gap-3 font-mono text-[12px]">
          <Picker
            label="A"
            value={leftId}
            options={variants}
            confirmedAt={confirmedAt}
            onChange={setLeftId}
          />
          <Picker
            label="B"
            value={rightId}
            options={variants}
            confirmedAt={confirmedAt}
            onChange={setRightId}
          />
        </div>
      </header>
      <Card title="元信息" token="meta">
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
      <Card title="章节结构" token="structure">
        <VariantDiffStructure left={left.content} right={right.content} />
      </Card>
      <Card title="关键段落" token="paragraphs">
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
      <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/85">
        {`// ${label}`}
      </span>
      <select
        className="h-8 rounded-[3px] border border-border bg-background/40 px-2 font-mono text-[12px] text-foreground focus:border-primary focus:outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((v) => {
          const stale = isStale(v, confirmedAt);
          return (
            <option key={v.id} value={v.id}>
              {v.title}
              {stale ? " · (stale)" : ""}
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

function Card({
  title,
  token,
  children,
}: {
  title: string;
  token: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-panel p-4">
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="font-display text-[16px] italic text-foreground">{title}</h3>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/70">
          {`// ${token}`}
        </span>
      </div>
      {children}
    </div>
  );
}
