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
      text: "下一步：补充参考书 2。补齐后才能进入分析与融合流程。",
    };
  }

  const totalChapters = input.chapterTotals.reduce((s, t) => s + t.total, 0);
  const totalAnalyzed = input.chapterTotals.reduce((s, t) => s + t.analyzed, 0);
  const remaining = totalChapters - totalAnalyzed;

  if (totalChapters === 0 || remaining > 0) {
    return {
      step: "chapter",
      text: `当前已分析 ${totalAnalyzed} / ${totalChapters} 章。建议先批量分析剩余 ${remaining} 章，建立基础结构画像。`,
    };
  }

  if (!input.bookSynthesisDone.a && !input.bookSynthesisDone.b) {
    return {
      step: "synth",
      text: "两本参考书都还未完成整书汇总。请在章节区点击“整书汇总”。",
    };
  }
  if (!input.bookSynthesisDone.a) {
    return { step: "synth", text: "接下来请完成参考书 1 的整书汇总。" };
  }
  if (!input.bookSynthesisDone.b) {
    return { step: "synth", text: "接下来请完成参考书 2 的整书汇总。" };
  }

  if (input.blueprintStatus !== "confirmed") {
    if (input.blueprintReady) {
      return {
        step: "confirm",
        text: "蓝图已经具备确认条件。检查关键卡片后，点击“确认蓝图”完成锁定。",
      };
    }
    return {
      step: "compare",
      text: "下一步请继续补齐蓝图中的关键卡片，完善后再确认蓝图。",
    };
  }

  if (input.variantCount === 0) {
    return {
      step: "generate",
      text: "蓝图已锁定。点击“生成新版本”开始创作。",
    };
  }

  if (input.variantCount >= 2) {
    return {
      step: "generate",
      text: "当前已有多个版本。可以直接比较不同生成结果。",
    };
  }

  return {
    step: "generate",
    text: "当前已有 1 个版本。可继续生成更多结果，做横向对比。",
  };
}
