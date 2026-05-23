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
    { key: "import", label: "导入", done: allBooksImported },
    { key: "chapter-analyze", label: "章节分析", done: allChaptersAnalyzed },
    { key: "synthesis", label: "整书汇总", done: allSynthesized },
    {
      key: "compare",
      label: "双书对照",
      done: p.blueprintStatus === "confirmed" || allSynthesized,
    },
    { key: "confirm", label: "确认蓝图", done: p.blueprintStatus === "confirmed" },
    { key: "generate", label: "生成变体", done: p.variantCount > 0 },
  ];

  return (
    <div className="surface-panel flex items-center gap-2 px-3 py-2 text-[12px]">
      {steps.map((s, i) => (
        <span
          key={s.key}
          className={`inline-flex items-center gap-1 ${
            s.done ? "text-emerald-300" : "text-muted-foreground"
          }`}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {s.label}
          {i < steps.length - 1 ? (
            <span className="mx-1 text-muted-foreground/40">·</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
