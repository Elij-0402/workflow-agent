import type { BookRow, VariantRow } from "@/lib/types";

export type ProjectOverviewInput = {
  sessionId: string;
  books: Array<Pick<BookRow, "chapter_count">>;
  bookSynthesisByBook: string[];
  blueprintStatus: "draft" | "confirmed";
  variants: Array<Pick<VariantRow, "id" | "title" | "scope">>;
};

export type ProjectOverviewKeyResult = {
  label: string;
  value: string;
};

export type ProjectOverviewNextAction = {
  label: string;
  href: string;
};

export type ProjectOverview = {
  statusLabel: string;
  progressLabel: string;
  editorialBullets: [string, string, string];
  nextAction: ProjectOverviewNextAction;
  keyResults: [ProjectOverviewKeyResult, ProjectOverviewKeyResult, ProjectOverviewKeyResult];
};

function createOverview(config: ProjectOverview): ProjectOverview {
  return config;
}

export function deriveProjectOverview(input: ProjectOverviewInput): ProjectOverview {
  const importedCount = input.books.length;
  const hasTwoBooks = input.books.length === 2;
  const analyzedBooks = new Set(input.bookSynthesisByBook).size;
  const hasConfirmedBlueprint = input.blueprintStatus === "confirmed";
  const fullVariantCount = input.variants.filter((variant) => variant.scope === "full").length;
  const hasFullVariants = fullVariantCount > 0;

  if (!hasTwoBooks) {
    return createOverview({
      statusLabel: "等待补全素材",
      progressLabel: `已导入 ${importedCount} / 2 本参考小说`,
      editorialBullets: [
        "先补齐第二本参考小说，系统才能给出稳定的融合判断。",
        "当前可先保留第一本的章节与人物基础结构。",
        "暂不建议进入生成，避免蓝图建立在单侧素材上。",
      ],
      nextAction: {
        label: "补充第二本参考书",
        href: `/upload?sessionId=${input.sessionId}&position=${importedCount}`,
      },
      keyResults: [
        { label: "参考小说", value: `${importedCount} / 2` },
        { label: "已切章节", value: String(input.books[0]?.chapter_count ?? 0) },
        { label: "蓝图状态", value: "未开始" },
      ],
    });
  }

  if (analyzedBooks < 2) {
    return createOverview({
      statusLabel: "等待完成分析",
      progressLabel: `已完成 ${analyzedBooks} / 2 本整书分析`,
      editorialBullets: [
        "先让两本书都形成整书级判断，再讨论融合策略。",
        "当前阶段适合继续沉淀章节摘要与基础世界观信息。",
        "不要过早进入生成，先把双书理解补齐。",
      ],
      nextAction: {
        label: "进入工作台继续分析",
        href: `/sessions/${input.sessionId}/workbench`,
      },
      keyResults: [
        { label: "参考小说", value: "2 / 2" },
        { label: "整书分析", value: `${analyzedBooks} / 2` },
        { label: "蓝图状态", value: "草稿" },
      ],
    });
  }

  if (!hasConfirmedBlueprint) {
    return createOverview({
      statusLabel: "等待确认蓝图",
      progressLabel: "两本参考小说已具备融合条件",
      editorialBullets: [
        "先锁定最值得保留的结构骨架，再决定生成方向。",
        "优先处理两书之间最强的互补点，而不是平均混合。",
        "确认蓝图后再开始生成，结果会更稳定。",
      ],
      nextAction: {
        label: "进入工作台确认蓝图",
        href: `/sessions/${input.sessionId}/workbench`,
      },
      keyResults: [
        { label: "参考小说", value: "2 / 2" },
        { label: "整书分析", value: "2 / 2" },
        { label: "蓝图状态", value: "待确认" },
      ],
    });
  }

  if (hasFullVariants) {
    return createOverview({
      statusLabel: "结果已生成",
      progressLabel: `已保存 ${fullVariantCount} 个生成版本`,
      editorialBullets: [
        "优先比较现有生成版本的骨架差异，再决定下一轮迭代。",
        "保留最稳定的融合骨架，避免每轮都重新发散。",
        "下一步更适合精修，而不是回到素材整理阶段。",
      ],
      nextAction: {
        label: "查看生成结果",
        href: `/sessions/${input.sessionId}?panel=results`,
      },
      keyResults: [
        { label: "参考小说", value: "2 / 2" },
        { label: "蓝图状态", value: "已确认" },
        { label: "生成版本", value: String(fullVariantCount) },
      ],
    });
  }

  return createOverview({
    statusLabel: "可以开始生成",
    progressLabel: "融合蓝图已确认，等待首个版本输出",
    editorialBullets: [
      "融合条件已经具备，可以进入首版生成。",
      "建议先生成骨架稳定的版本，不要一次追求过多风格变化。",
      "生成后优先比较结构和角色张力，再做第二轮迭代。",
    ],
    nextAction: {
      label: "进入结果区开始生成",
      href: `/sessions/${input.sessionId}?panel=results`,
    },
    keyResults: [
      { label: "参考小说", value: "2 / 2" },
      { label: "蓝图状态", value: "已确认" },
      { label: "生成版本", value: "0" },
    ],
  });
}
