"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChapterCard, type CandidateAddRequest } from "./chapter-card";
import { FilterBar, type FilterState } from "./filter-bar";
import type { ChapterBriefResult } from "@/lib/types";

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
  chapters: Chapter[];
  briefs: Brief[];
  chapterStatus: Record<string, "idle" | "running" | "done" | "error">;
  synthesisDone: boolean;
  onRunChapter: (chapterId: string) => void;
  onRunBatch: () => void;
  onSynthesize: () => void;
  onAddCandidate: (c: CandidateAddRequest) => void;
};

export function ChapterTree({
  book,
  chapters,
  briefs,
  chapterStatus,
  synthesisDone,
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

  return (
    <div className="surface-panel flex h-full flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border/70 p-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{book.title}</div>
          <div className="text-[11px] text-muted-foreground">
            {chapters.length} 章 · 已分析 {chapters.length - pendingCount}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {pendingCount > 0 ? (
            <Button size="sm" variant="outline" onClick={onRunBatch}>
              分析未完成 ({pendingCount})
            </Button>
          ) : null}
          {allChaptersAnalyzed ? (
            <Button
              size="sm"
              variant={synthesisDone ? "ghost" : "default"}
              onClick={onSynthesize}
            >
              {synthesisDone ? "重做汇总" : "整书汇总"}
            </Button>
          ) : null}
        </div>
      </header>
      <FilterBar options={filterOptions} value={filter} onChange={setFilter} />
      <div className="flex-1 overflow-auto">
        {visibleChapters.length === 0 ? (
          <p className="p-3 text-[12px] text-muted-foreground">
            {chapters.length === 0 ? "还没有章节。" : "筛选未命中任何章节。"}
          </p>
        ) : (
          visibleChapters.map((c) => (
            <ChapterCard
              key={c.id}
              chapter={c}
              brief={briefByChapter.get(c.id) ?? null}
              status={chapterStatus[c.id] ?? "idle"}
              onAnalyze={() => onRunChapter(c.id)}
              onAddCandidate={onAddCandidate}
            />
          ))
        )}
      </div>
    </div>
  );
}
