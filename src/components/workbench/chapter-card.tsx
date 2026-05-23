"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";

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
  onAnalyze: () => void;
  onAddCandidate: (c: CandidateAddRequest) => void;
};

export function ChapterCard({
  chapter,
  brief,
  status,
  onAnalyze,
  onAddCandidate,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasBrief = Boolean(brief);
  const busy = status === "running";

  return (
    <div className="border-b border-border/40 px-3 py-2 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">
          {chapter.index}. {chapter.title}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {hasBrief ? (
            <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? <ChevronUp /> : <ChevronDown />}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={busy} onClick={onAnalyze}>
              {busy ? <Loader2 className="animate-spin" /> : "分析"}
            </Button>
          )}
        </div>
      </div>

      {status === "error" ? (
        <p className="mt-1 text-[11px] text-rose-300">本章分析失败，可单独重试。</p>
      ) : null}

      {brief && open ? (
        <div className="mt-2 space-y-2 text-[12.5px] text-muted-foreground">
          <p>{brief.summary}</p>
          {brief.blueprint_candidates.length === 0 ? (
            <p className="text-[11px] italic">该章没有自动生成的蓝图候选。</p>
          ) : null}
          {brief.blueprint_candidates.map((cand, i) => {
            const payload = (cand.payload ?? {}) as Record<string, unknown>;
            return (
              <div
                key={i}
                className="flex items-start justify-between gap-2 rounded-[7px] border border-border/40 bg-background/40 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                    {cand.section}
                  </div>
                  <div className="truncate text-foreground">{cand.title}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
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
              </div>
            );
          })}
        </div>
      ) : null}

      {chapter.source !== "regex" ? (
        <p className="mt-1 text-[11px] text-amber-300/80">
          章节来源：{chapter.source === "length-chunk" ? "按字数兜底" : "手工编辑"}
        </p>
      ) : null}
    </div>
  );
}
