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
  const done = hasBrief && status !== "error";
  const idxStr = String(chapter.index).padStart(2, "0");

  return (
    <div className="border-b border-dashed border-border/40 px-3 py-2.5 text-[13px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-primary/80">
            {idxStr}
          </span>
          <span
            className={`font-mono text-[11px] ${
              done
                ? "text-flash"
                : busy
                  ? "text-primary animate-pulse"
                  : "text-muted-foreground/60"
            }`}
            aria-hidden
          >
            {busy ? "◐" : done ? "●" : "○"}
          </span>
          <span className="truncate text-foreground">{chapter.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {hasBrief ? (
            <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
              {open ? <ChevronUp /> : <ChevronDown />}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={busy} onClick={onAnalyze}>
              {busy ? <Loader2 className="animate-spin" /> : "分析此章"}
            </Button>
          )}
        </div>
      </div>

      {status === "error" ? (
        <p className="mt-1.5 ml-7 font-mono text-[10.5px] uppercase tracking-[0.08em] text-destructive">
          {"// analysis failed — retry"}</p>
      ) : null}

      {brief && open ? (
        <div className="mt-3 ml-7 space-y-3 text-[12.5px] text-muted-foreground">
          <p className="italic-cap leading-7">{brief.summary}</p>
          {brief.blueprint_candidates.length === 0 ? (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/70">
              {"// no auto candidates"}</p>
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary hover:text-primary"
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
        <p className="mt-1.5 ml-7 font-mono text-[10.5px] uppercase tracking-[0.08em] text-primary/70">
          {`// source · ${chapter.source === "length-chunk" ? "length chunk" : "manual"}`}
        </p>
      ) : null}
    </div>
  );
}
