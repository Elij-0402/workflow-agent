import type { BlueprintStatus } from "@/lib/blueprint/schema";

export type WorkbenchStep = "import" | "chapter" | "synth" | "compare" | "confirm" | "generate";

export type HintInput = {
  importedCount: number;
  chapterTotals: Array<{ bookId: string; total: number; analyzed: number }>;
  bookSynthesisDone: { a: boolean; b: boolean };
  blueprintStatus: BlueprintStatus;
  blueprintReady: boolean;
  variantCount: number;
};

export type Hint = {
  step: WorkbenchStep;
  text: string;
};

export function deriveHint(input: HintInput): Hint {
  if (input.importedCount < 2) {
    return {
      step: "import",
      text: "// next · 补充参考书 2 · 补齐后再进入分析和融合流程",
    };
  }

  const totalChapters = input.chapterTotals.reduce((s, t) => s + t.total, 0);
  const totalAnalyzed = input.chapterTotals.reduce((s, t) => s + t.analyzed, 0);
  const remaining = totalChapters - totalAnalyzed;

  if (totalChapters === 0 || remaining > 0) {
    return {
      step: "chapter",
      text: `// next · ${totalAnalyzed} / ${totalChapters} 章节已分析 · 推荐批量分析剩余 ${remaining} 章`,
    };
  }

  if (!input.bookSynthesisDone.a && !input.bookSynthesisDone.b) {
    return {
      step: "synth",
      text: "// next · 两本参考书都待整书汇总 · 在章节区点击「整书汇总」",
    };
  }
  if (!input.bookSynthesisDone.a) {
    return { step: "synth", text: "// next · 等待参考书 1 整书汇总" };
  }
  if (!input.bookSynthesisDone.b) {
    return { step: "synth", text: "// next · 等待参考书 2 整书汇总" };
  }

  if (input.blueprintStatus !== "confirmed") {
    if (input.blueprintReady) {
      return {
        step: "confirm",
        text: "// next · 蓝图可确认 · 检查后点击「确认蓝图」锁定",
      };
    }
    return {
      step: "compare",
      text: "// next · 在 blueprint 模式编辑卡片 · 补齐必填项后再确认",
    };
  }

  if (input.variantCount === 0) {
    return {
      step: "generate",
      text: "// next · 蓝图已锁定 · 点击「生成新版本」开始创作",
    };
  }

  if (input.variantCount >= 2) {
    return {
      step: "generate",
      text: "// next · 切到 variants 模式对比多个生成版本",
    };
  }

  return {
    step: "generate",
    text: "// next · 已生成 1 个变体 · 可继续生成做横向对比",
  };
}
