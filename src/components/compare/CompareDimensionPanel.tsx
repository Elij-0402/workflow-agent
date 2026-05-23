"use client";

import { useState } from "react";

import { CharactersCompare } from "@/components/compare/CharactersCompare";
import { EmotionArcOverlay } from "@/components/compare/EmotionArcOverlay";
import { NarrativeCompare } from "@/components/compare/NarrativeCompare";
import { PacingOverlay } from "@/components/compare/PacingOverlay";
import { ProseCraftRadarOverlay } from "@/components/compare/ProseCraftRadarOverlay";
import { SuspenseGridOverlay } from "@/components/compare/SuspenseGridOverlay";
import { WorldviewCompare } from "@/components/compare/WorldviewCompare";
import { AnalysisDetail } from "@/components/sessions/analysis-detail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getBookColorHsl } from "@/lib/compare/book-color";
import { distanceBand } from "@/lib/compare/distance";
import { DIMENSION_LABELS, type AnalysisDimension } from "@/lib/types";

type Book = {
  bookId: string;
  label: string;
  displayTitle: string;
  analyses: Partial<Record<AnalysisDimension, unknown>>;
};

type Props = {
  dimensions: readonly AnalysisDimension[];
  books: Book[];
  distances: Partial<Record<AnalysisDimension, number | null>>;
  active: AnalysisDimension;
  onChange: (d: AnalysisDimension) => void;
};

type ViewMode = "overlay" | "split";

const OVERLAY_DIMENSIONS = new Set<AnalysisDimension>([
  "worldview",
  "characters",
  "narrative",
  "emotion_arc",
  "pacing_map",
  "suspense_grid",
  "prose_craft",
]);

function DistanceDot({ score }: { score: number | null }) {
  const band = distanceBand(score);
  const bg =
    band === "high"
      ? "hsl(var(--destructive))"
      : band === "mid"
        ? "hsl(var(--primary))"
        : band === "low"
          ? "hsl(var(--muted-foreground) / 0.6)"
          : "transparent";
  const border = band === "none" ? "1px dashed hsl(var(--border))" : "none";
  return (
    <span
      title={score === null ? "数据不足" : `差异指数 ${score}`}
      className="ml-2 inline-block h-[8px] w-[8px] rounded-full align-middle"
      style={{ background: bg, border }}
    />
  );
}

function OverlayFor({ dim, books }: { dim: AnalysisDimension; books: Book[] }) {
  const overlayBooks = books.map((b, i) => ({
    bookId: b.bookId,
    label: b.label,
    index: i,
    result: b.analyses[dim],
  }));
  switch (dim) {
    case "worldview":
      return <WorldviewCompare books={overlayBooks} />;
    case "characters":
      return <CharactersCompare books={overlayBooks} />;
    case "narrative":
      return <NarrativeCompare books={overlayBooks} />;
    case "emotion_arc":
      return <EmotionArcOverlay books={overlayBooks} />;
    case "pacing_map":
      return <PacingOverlay books={overlayBooks} />;
    case "suspense_grid":
      return <SuspenseGridOverlay books={overlayBooks} />;
    case "prose_craft":
      return <ProseCraftRadarOverlay books={overlayBooks} />;
    default:
      return null;
  }
}

function SplitFor({ dim, books }: { dim: AnalysisDimension; books: Book[] }) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${books.length}, minmax(360px, 1fr))`,
        }}
      >
        {books.map((b, i) => (
          <div
            key={b.bookId}
            className="surface-panel relative overflow-hidden p-5"
            style={{ borderTop: `2px solid ${getBookColorHsl(i)}` }}
          >
            <p
              className="font-mono text-[10.5px] uppercase tracking-[0.10em]"
              style={{ color: getBookColorHsl(i, 0.85) }}
            >
              {b.label}
            </p>
            <h3 className="mt-2 line-clamp-2 font-display text-[18px] italic leading-tight text-foreground">
              {b.displayTitle}
            </h3>
            <div className="mt-4 border-t border-dashed border-border/60 pt-4">
              {b.analyses[dim] !== undefined ? (
                <AnalysisDetail dimension={dim} result={b.analyses[dim]} />
              ) : (
                <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground/70">
                  该维度尚未分析
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompareDimensionPanel({
  dimensions,
  books,
  distances,
  active,
  onChange,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("overlay");
  const supportsOverlay = OVERLAY_DIMENSIONS.has(active);
  const effectiveMode: ViewMode = supportsOverlay ? viewMode : "split";

  return (
    <Tabs
      value={active}
      onValueChange={(v) => onChange(v as AnalysisDimension)}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList className="flex-wrap">
          {dimensions.map((dim) => {
            const count = books.filter((b) => Boolean(b.analyses[dim])).length;
            return (
              <TabsTrigger key={dim} value={dim}>
                <span>{DIMENSION_LABELS[dim]}</span>
                <span className="ml-2 font-mono text-[10px] text-muted-foreground/70">
                  {count}/{books.length}
                </span>
                <DistanceDot score={distances[dim] ?? null} />
              </TabsTrigger>
            );
          })}
        </TabsList>

        {supportsOverlay ? (
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            size="sm"
            variant="outline"
          >
            <ToggleGroupItem
              value="overlay"
              className="font-mono text-[10px] uppercase"
            >
              overlay
            </ToggleGroupItem>
            <ToggleGroupItem
              value="split"
              className="font-mono text-[10px] uppercase"
            >
              split
            </ToggleGroupItem>
          </ToggleGroup>
        ) : null}
      </div>

      {dimensions.map((dim) => (
        <TabsContent key={dim} value={dim} className="pt-2">
          {effectiveMode === "overlay" && OVERLAY_DIMENSIONS.has(dim) ? (
            <OverlayFor dim={dim} books={books} />
          ) : (
            <SplitFor dim={dim} books={books} />
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
