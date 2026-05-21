import type { BlueprintStatus } from "@/lib/blueprint/schema";

type Props = {
  importedCount: number;
  chapterTotals: Array<{ bookId: string; total: number; analyzed: number }>;
  bookSynthesisDone: { a: boolean; b: boolean };
  blueprintStatus: BlueprintStatus;
  variantCount: number;
};

export function PipelineBar(p: Props) {
  const allBooksImported = p.importedCount === 2;
  const allChaptersAnalyzed =
    p.chapterTotals.length > 0 &&
    p.chapterTotals.every((t) => t.total > 0 && t.analyzed === t.total);
  const allSynthesized = p.bookSynthesisDone.a && p.bookSynthesisDone.b;

  const steps = [
    { key: "import", no: "01", label: "import", done: allBooksImported },
    { key: "chapter-analyze", no: "02", label: "chapter", done: allChaptersAnalyzed },
    { key: "synthesis", no: "03", label: "synth", done: allSynthesized },
    {
      key: "compare",
      no: "04",
      label: "compare",
      done: p.blueprintStatus === "confirmed" || allSynthesized,
    },
    { key: "confirm", no: "05", label: "confirm", done: p.blueprintStatus === "confirmed" },
    { key: "generate", no: "06", label: "generate", done: p.variantCount > 0 },
  ];

  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="surface-panel flex flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em]">
      {steps.map((s, i) => {
        const isCurrent = i === currentIdx;
        const glyph = s.done ? "●" : isCurrent ? "◐" : "○";
        const glyphColor = s.done
          ? "text-flash"
          : isCurrent
            ? "text-primary"
            : "text-muted-foreground/55";
        const numColor = s.done
          ? "text-flash"
          : isCurrent
            ? "text-primary"
            : "text-muted-foreground/70";
        const labelColor = s.done
          ? "text-foreground"
          : isCurrent
            ? "text-foreground"
            : "text-muted-foreground";
        return (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="px-1 text-primary/30">─┄─</span> : null}
            <span
              className={`${glyphColor}${isCurrent ? "motion-safe:animate-pulse" : ""}`}
              aria-hidden
            >
              {glyph}
            </span>
            <span className={numColor}>{s.no}</span>
            <span className={labelColor}>{s.label}</span>
          </span>
        );
      })}
    </div>
  );
}
