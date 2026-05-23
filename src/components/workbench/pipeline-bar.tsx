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
  const analysisDone = allBooksImported && allChaptersAnalyzed && allSynthesized;
  const blueprintConfirmed = p.blueprintStatus === "confirmed";
  const hasVariants = p.variantCount > 0;

  const steps = [
    { no: "1", label: "分析素材", done: analysisDone },
    { no: "2", label: "编辑蓝图", done: blueprintConfirmed },
    { no: "3", label: "生成变体", done: hasVariants },
  ];

  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="surface-panel flex items-center gap-2 px-4 py-2.5 text-[12px]">
      {steps.map((s, i) => {
        const isCurrent = i === currentIdx;
        const glyph = s.done ? "●" : isCurrent ? "◐" : "○";
        const glyphColor = s.done
          ? "text-flash"
          : isCurrent
            ? "text-primary"
            : "text-muted-foreground/55";
        const labelColor = s.done || isCurrent ? "text-foreground" : "text-muted-foreground";
        return (
          <span key={s.no} className="inline-flex items-center gap-2">
            {i > 0 ? <span className="px-1 text-primary/30">─</span> : null}
            <span
              className={`${glyphColor}${isCurrent ? " motion-safe:animate-pulse" : ""}`}
              aria-hidden
            >
              {glyph}
            </span>
            <span className={`text-muted-foreground/60`}>{s.no}</span>
            <span className={labelColor}>{s.label}</span>
          </span>
        );
      })}
    </div>
  );
}
