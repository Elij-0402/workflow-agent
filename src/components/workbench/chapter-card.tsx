"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Lock, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { BlueprintSection } from "@/lib/blueprint/schema";
import type { ChapterBriefResult } from "@/lib/types";

export type CandidateAddRequest = {
  section: BlueprintSection;
  title: string;
  payload: Record<string, unknown>;
  chapterId: string;
};

type Props = {
  chapter: {
    id: string;
    index: number;
    title: string;
    source: "regex" | "length-chunk" | "manual";
  };
  brief: ChapterBriefResult | null;
  status: "idle" | "running" | "done" | "error";
  blueprintLocked?: boolean;
  onAnalyze: () => void;
  onAddCandidate: (c: CandidateAddRequest) => void;
};

const SECTION_LABEL: Record<string, string> = {
  characters: "character",
  relationships: "relationship",
  world_rules: "world",
  conflicts: "conflict",
  plot_beats: "beat",
  themes: "theme",
};

const SOURCE_LABEL: Record<string, string> = {
  regex: "regex",
  "length-chunk": "length chunk",
  manual: "manual",
};

export function ChapterCard({
  chapter,
  brief,
  status,
  blueprintLocked = false,
  onAnalyze,
  onAddCandidate,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasBrief = Boolean(brief);
  const busy = status === "running";
  const done = hasBrief && status !== "error";
  const idxStr = String(chapter.index).padStart(2, "0");

  const candidateCounts = useMemo(() => {
    if (!brief) return [] as Array<{ section: string; count: number }>;
    const map = new Map<string, number>();
    for (const c of brief.blueprint_candidates) {
      map.set(c.section, (map.get(c.section) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([section, count]) => ({ section, count }));
  }, [brief]);

  const titleRow = (
    <>
      <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-primary/80">
        {idxStr}
      </span>
      <span
        className={`font-mono text-[11px] ${
          done ? "text-flash" : busy ? "animate-pulse text-primary" : "text-muted-foreground/60"
        }`}
        aria-hidden
      >
        {busy ? "◐" : done ? "●" : "○"}
      </span>
      <span className="sr-only">
        {busy ? "进行中" : done ? "已完成" : status === "error" ? "失败" : "未开始"}
      </span>
      <span className="truncate text-foreground">{chapter.title}</span>
    </>
  );

  return (
    <div className="border-b border-dashed border-border/40 px-3 py-2.5 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        {hasBrief ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-colors hover:text-foreground"
            style={{ transitionDuration: "var(--duration-fast)" }}
            aria-expanded={open}
            aria-label={`${open ? "折叠" : "展开"}章节 ${chapter.index} ${chapter.title}`}
          >
            {titleRow}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">{titleRow}</div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          {hasBrief ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "折叠候选" : "展开候选"}
            >
              {open ? <ChevronUp /> : <ChevronDown />}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onAnalyze}
              aria-label={`分析章节 ${chapter.index}`}
            >
              {busy ? <Loader2 className="animate-spin" /> : "分析此章"}
            </Button>
          )}
        </div>
      </div>

      {hasBrief && !open && candidateCounts.length > 0 ? (
        <div className="ml-7 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
          {candidateCounts.map(({ section, count }) => (
            <span key={section}>
              {SECTION_LABEL[section] ?? section} · <span className="text-primary/80">{count}</span>
            </span>
          ))}
        </div>
      ) : null}

      {status === "error" ? (
        <p className="ml-7 mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-destructive">
          {"// failed"}
        </p>
      ) : null}

      {brief && open ? (
        <div className="ml-7 mt-3 space-y-3 text-[12.5px] text-muted-foreground">
          <p className="leading-7">{brief.summary}</p>
          {brief.blueprint_candidates.length === 0 ? (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/70">
              {"// no auto candidates"}
            </p>
          ) : null}
          {brief.blueprint_candidates.map((cand, i) => {
            const payload = (cand.payload ?? {}) as Record<string, unknown>;
            return (
              <div
                key={i}
                className="flex items-start justify-between gap-2 rounded-[2px] border border-border bg-background/40 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.10em] text-primary/80">
                    {`// ${cand.section}`}
                  </div>
                  <div className="mt-0.5 truncate text-foreground">{cand.title}</div>
                </div>
                {blueprintLocked ? (
                  <span
                    title="蓝图已锁定 · 解锁后才能添加候选"
                    className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground/55"
                    aria-label="蓝图已锁定，候选添加不可用"
                  >
                    <Lock className="h-3.5 w-3.5" aria-hidden />
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary hover:text-primary"
                    aria-label={`添加 ${cand.section} 候选 ${cand.title}`}
                    onClick={() =>
                      onAddCandidate({
                        section: cand.section as BlueprintSection,
                        title: cand.title,
                        payload,
                        chapterId: chapter.id,
                      })
                    }
                  >
                    <Plus />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="ml-7 mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-primary/55">
        {`// source · ${SOURCE_LABEL[chapter.source] ?? chapter.source}`}
      </p>
    </div>
  );
}
