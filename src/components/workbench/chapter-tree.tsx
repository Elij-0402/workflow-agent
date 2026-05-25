"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CTA_COPY } from "@/lib/ui/cta-copy";
import { ChapterCard, type CandidateAddRequest } from "./chapter-card";
import { FilterBar, type FilterState } from "./filter-bar";
import type { ChapterBriefResult } from "@/lib/types";
import {
  buildBookAnalysisSummary,
  getAnalysisModeLabel,
  getCompatibilityLabel,
  getGateStatusLabel,
} from "@/lib/workbench/analysis-display";

type Chapter = {
  id: string;
  book_id: string;
  index: number;
  title: string;
  source: "regex" | "length-chunk" | "manual";
};

type Brief = { chapter_id: string; result: ChapterBriefResult };

type Props = {
  book: { id: string; title: string; chapter_count: number | null };
  position?: "A" | "B";
  chapters: Chapter[];
  briefs: Array<Brief & { dimension?: "chapter_brief" | "block_brief" }>;
  analysisMode?: "chaptered" | "block-fallback";
  gateStatus?: "pass" | "retryable" | "fallback_only" | "blocked";
  compatibilityStatus?: "supported" | "risky" | "incompatible";
  chapterStatus: Record<string, "idle" | "running" | "done" | "error">;
  synthesisDone: boolean;
  blueprintLocked?: boolean;
  onRunChapter: (chapterId: string) => void;
  onRunBatch: () => void;
  onSynthesize: () => void;
  onAddCandidate: (c: CandidateAddRequest) => void;
};

export function ChapterTree({
  book,
  position,
  chapters,
  briefs,
  analysisMode = "chaptered",
  gateStatus = "pass",
  compatibilityStatus = "supported",
  chapterStatus,
  synthesisDone,
  blueprintLocked = false,
  onRunChapter,
  onRunBatch,
  onSynthesize,
  onAddCandidate,
}: Props) {
  const briefByChapter = useMemo(() => {
    const m = new Map<string, ChapterBriefResult>();
    for (const b of briefs) m.set(b.chapter_id, b.result);
    return m;
  }, [briefs]);

  const allChaptersAnalyzed =
    chapters.length > 0 && chapters.every((c) => briefByChapter.has(c.id));
  const pendingCount = chapters.filter((c) => !briefByChapter.has(c.id)).length;
  const analyzedCount = chapters.length - pendingCount;

  const filterOptions = useMemo(() => {
    const characters = new Set<string>();
    const conflicts = new Set<string>();
    for (const b of briefs) {
      for (const ch of b.result.characters_appeared) characters.add(ch.name);
      for (const c of b.result.conflicts) conflicts.add(c);
    }
    return {
      characters: [...characters].sort(),
      conflicts: [...conflicts].sort(),
    };
  }, [briefs]);

  const [filter, setFilter] = useState<FilterState>({
    characters: [],
    conflicts: [],
    themeKeyword: "",
  });

  const visibleChapters = useMemo(() => {
    const anyFilter =
      filter.characters.length > 0 ||
      filter.conflicts.length > 0 ||
      filter.themeKeyword.trim().length > 0;
    if (!anyFilter) return chapters;
    return chapters.filter((c) => {
      const brief = briefByChapter.get(c.id);
      if (!brief) return false;
      if (filter.characters.length > 0) {
        const names = new Set(brief.characters_appeared.map((a) => a.name));
        if (!filter.characters.some((n) => names.has(n))) return false;
      }
      if (filter.conflicts.length > 0) {
        const set = new Set(brief.conflicts);
        if (!filter.conflicts.some((n) => set.has(n))) return false;
      }
      const kw = filter.themeKeyword.trim();
      if (kw) {
        const blob = brief.themes_hints.join("|");
        if (!blob.includes(kw)) return false;
      }
      return true;
    });
  }, [chapters, briefByChapter, filter]);

  const chunkLabel = analysisMode === "block-fallback" ? "个片段" : "章";
  const batchLabel =
    analysisMode === "block-fallback"
      ? "批量分析片段"
      : CTA_COPY.batchAnalysis;
  const synthLabel = synthesisDone ? "重新生成整书汇总" : "整书汇总";
  const positionLabel =
    position === "A" ? "参考书一" : position === "B" ? "参考书二" : null;
  const summary = buildBookAnalysisSummary({
    title: book.title,
    chapterCount: chapters.length,
    analyzedCount,
    analysisMode,
    gateStatus,
    compatibilityStatus,
  });

  return (
    <div className="surface-panel flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-dashed border-border/70 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {position ? (
              <span className="type-caption font-medium text-muted-foreground">
                {positionLabel}
              </span>
            ) : null}
            <h3 className="truncate font-display text-[16px] italic leading-tight text-foreground">
              {book.title}
            </h3>
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            共 {chapters.length} {chunkLabel}，已分析 {analyzedCount}{" "}
            {chunkLabel}
          </div>
          <p className="mt-2 max-w-2xl text-[12px] leading-6 text-muted-foreground">
            {summary}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
            <span className="rounded-full border border-border/70 px-2 py-0.5">
              分析方式：{getAnalysisModeLabel(analysisMode)}
            </span>
            <span className="rounded-full border border-border/70 px-2 py-0.5">
              分析准入：{getGateStatusLabel(gateStatus)}
            </span>
            <span className="rounded-full border border-border/70 px-2 py-0.5">
              模型适配：{getCompatibilityLabel(compatibilityStatus)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {pendingCount > 0 ? (
            <Button size="sm" variant="outline" onClick={onRunBatch}>
              {batchLabel} ({pendingCount})
            </Button>
          ) : null}
          {allChaptersAnalyzed ? (
            <Button
              size="sm"
              variant={synthesisDone ? "ghost" : "default"}
              className={
                synthesisDone
                  ? "font-mono uppercase tracking-[0.08em]"
                  : undefined
              }
              onClick={onSynthesize}
            >
              {synthLabel}
            </Button>
          ) : null}
        </div>
      </header>
      <div className="border-b border-dashed border-border/60 px-4 py-2 text-[12px] text-muted-foreground">
        {analysisMode === "block-fallback"
          ? "批量分析适合先建立整书结构画像，不建议替代人工精读。当前会按片段提取人物、事件、冲突和主题线索。"
          : "批量分析适合先建立整书结构画像，不建议替代人工精读。关键章节建议人工抽查。"}
      </div>
      <FilterBar options={filterOptions} value={filter} onChange={setFilter} />
      <div className="flex-1 overflow-auto">
        {visibleChapters.length === 0 ? (
          <div className="flex flex-col gap-1 p-4">
            <p className="text-[12px] font-medium text-muted-foreground/70">
              {chapters.length === 0 ? "暂无章节数据" : "当前筛选没有匹配结果"}
            </p>
            <p className="text-[13px] leading-7 text-muted-foreground">
              {chapters.length === 0
                ? "暂无章节数据，等待上传完成或重新解析。"
                : "没有匹配的章节，调整筛选条件再试。"}
            </p>
          </div>
        ) : (
          visibleChapters.map((c) => (
            <ChapterCard
              key={c.id}
              chapter={c}
              brief={briefByChapter.get(c.id) ?? null}
              status={chapterStatus[c.id] ?? "idle"}
              blueprintLocked={blueprintLocked}
              onAnalyze={() => onRunChapter(c.id)}
              onAddCandidate={onAddCandidate}
            />
          ))
        )}
      </div>
    </div>
  );
}
