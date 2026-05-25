import type { SessionStatus } from "@/lib/types";

export type SessionDashboardSeed = {
  id: string;
  name: string;
  status: SessionStatus | string;
  mode: "single" | "dual" | string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  bookCount: number;
  chapterCount: number;
  analyzedBookCount: number;
  blueprintStatus: "draft" | "confirmed" | null;
  activeBriefCount: number;
  variantCount: number;
  lastActivityLabel: string | null;
};

export type SessionDashboardItem = SessionDashboardSeed & {
  modeLabel: string;
  modeTone: "primary" | "muted";
  stageLabel: string;
  nextActionLabel: string;
  nextHref: string;
  progressLabel: string;
  lastActivityLabel: string;
};

export type DashboardSummary = {
  activeProjectCount: number;
  waitingBlueprintCount: number;
  activeBriefCount: number;
  generatedVariantCount: number;
};

export function deriveSessionDashboard(
  seed: SessionDashboardSeed,
): SessionDashboardItem {
  const lastActivityLabel = seed.lastActivityLabel ?? "等待下一步";

  if (seed.mode === "dual") {
    if (seed.bookCount < 2) {
      return {
        ...seed,
        modeLabel: "双书项目",
        modeTone: "primary",
        stageLabel: "待补素材",
        nextActionLabel: "补齐参考书",
        nextHref: `/upload?sessionId=${seed.id}&position=${seed.bookCount}`,
        progressLabel: `已导入 ${seed.bookCount} / 2 本参考书`,
        lastActivityLabel: seed.lastActivityLabel ?? "等待导入第二本参考书",
      };
    }

    if (seed.analyzedBookCount < 2) {
      return {
        ...seed,
        modeLabel: "双书项目",
        modeTone: "primary",
        stageLabel: "进行中",
        nextActionLabel: "继续分析",
        nextHref: `/sessions/${seed.id}/workbench?step=analysis`,
        progressLabel: `${seed.analyzedBookCount} / 2 本整书分析已完成`,
        lastActivityLabel,
      };
    }

    if (seed.blueprintStatus !== "confirmed") {
      return {
        ...seed,
        modeLabel: "双书项目",
        modeTone: "primary",
        stageLabel: "待确认蓝图",
        nextActionLabel: "进入蓝图工作台",
        nextHref: `/sessions/${seed.id}/workbench`,
        progressLabel: "2 本整书分析已完成",
        lastActivityLabel,
      };
    }

    if (seed.variantCount > 0) {
      return {
        ...seed,
        modeLabel: "双书项目",
        modeTone: "primary",
        stageLabel: "已完成首轮",
        nextActionLabel: "查看生成结果",
        nextHref: `/sessions/${seed.id}/workbench?step=generate`,
        progressLabel: `已生成 ${seed.variantCount} 个版本`,
        lastActivityLabel,
      };
    }

    return {
      ...seed,
      modeLabel: "双书项目",
      modeTone: "primary",
      stageLabel: "可生成",
      nextActionLabel: "进入结果实验室",
      nextHref: `/sessions/${seed.id}/workbench?step=generate`,
      progressLabel: "蓝图已确认，等待首个版本",
      lastActivityLabel,
    };
  }

  const singleNextHref = `/sessions/${seed.id}`;
  const chapterLabel =
    seed.chapterCount > 0 ? `${seed.chapterCount} 章` : "待切章";
  const hasResults = seed.variantCount > 0;

  return {
    ...seed,
    modeLabel: "单书兼容",
    modeTone: "muted",
    stageLabel: hasResults ? "已生成结果" : "进行中",
    nextActionLabel: hasResults ? "查看结果" : "继续分析",
    nextHref: singleNextHref,
    progressLabel: `单书流程 · ${chapterLabel}`,
    lastActivityLabel,
  };
}

export function deriveDashboardSummary(
  sessions: SessionDashboardItem[],
): DashboardSummary {
  return {
    activeProjectCount: sessions.length,
    waitingBlueprintCount: sessions.filter(
      (session) => session.stageLabel === "待确认蓝图",
    ).length,
    activeBriefCount: sessions.reduce(
      (sum, session) => sum + session.activeBriefCount,
      0,
    ),
    generatedVariantCount: sessions.reduce(
      (sum, session) => sum + session.variantCount,
      0,
    ),
  };
}
