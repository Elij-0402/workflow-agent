"use client";

import { useState } from "react";

import { AnalysisDetail } from "@/components/sessions/analysis-detail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ANALYSIS_DIMENSIONS,
  DIMENSION_LABELS,
  EXTENDED_ANALYSIS_DIMENSIONS,
  type AnalysisDimension,
} from "@/lib/types";

export type CompareBook = {
  bookId: string;
  sessionId: string;
  displayTitle: string;
  analyses: Partial<Record<AnalysisDimension, unknown>>;
};

type Props = {
  books: CompareBook[];
};

const COMPARE_DIMENSIONS = [
  ...ANALYSIS_DIMENSIONS,
  ...EXTENDED_ANALYSIS_DIMENSIONS,
] as const satisfies readonly AnalysisDimension[];

export function CompareClient({ books }: Props) {
  const [active, setActive] = useState<AnalysisDimension>(COMPARE_DIMENSIONS[0]);

  return (
    <Tabs
      value={active}
      onValueChange={(v) => setActive(v as AnalysisDimension)}
      className="space-y-4"
    >
      <TabsList className="flex-wrap">
        {COMPARE_DIMENSIONS.map((dim) => {
          const count = books.filter((b) => Boolean(b.analyses[dim])).length;
          return (
            <TabsTrigger key={dim} value={dim}>
              {DIMENSION_LABELS[dim]}
              <span className="ml-2 font-mono text-[10px] text-muted-foreground/70">
                {count}/{books.length}
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {COMPARE_DIMENSIONS.map((dim) => (
        <TabsContent key={dim} value={dim} className="pt-2">
          <div className="overflow-x-auto">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${books.length}, minmax(360px, 1fr))`,
              }}
            >
              {books.map((b) => (
                <div key={b.bookId} className="surface-panel p-5">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/85">
                    {`// ${dim}`}
                  </p>
                  <h3 className="mt-2 line-clamp-2 font-display text-[18px] italic leading-tight text-foreground">
                    {b.displayTitle}
                  </h3>
                  <div className="mt-4 border-t border-dashed border-border/60 pt-4">
                    {b.analyses[dim] !== undefined ? (
                      <AnalysisDetail dimension={dim} result={b.analyses[dim]} />
                    ) : (
                      <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground/70">
                        {"// 该维度尚未分析"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
