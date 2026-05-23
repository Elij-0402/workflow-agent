import { notFound } from "next/navigation";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import { AnalysisPanel } from "./analysis-panel";
import { ExtendedAnalysisPanel } from "./extended-analysis-panel";
import { loadDualSessionPageData, loadSingleSessionPageData } from "./page-data";
import { ProjectOverviewPage } from "@/components/projects/project-overview-page";
import { GeneratePanel } from "@/components/sessions/generate-panel";
import { VariantList } from "@/components/sessions/variant-list";
import { MetaRow } from "@/components/meta-row";
import { PageHeader } from "@/components/page-header";
import {
  WorkflowStageBar,
  type WorkflowStageItem,
} from "@/components/workflow-stage-bar";
import { Button } from "@/components/ui/button";
import { deriveProjectOverview } from "@/lib/projects/overview";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelativeTime } from "@/lib/utils";

type SessionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SessionDetailPage({
  params,
}: SessionPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: sessionMode } = await supabase
    .from("sessions")
    .select("mode")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sessionMode?.mode === "dual") {
    const dualData = await loadDualSessionPageData({
      supabase,
      sessionId: id,
      userId: user.id,
    });
    if (!dualData) notFound();

    const overview = deriveProjectOverview({
      sessionId: dualData.session.id,
      books: dualData.books,
      bookSynthesisByBook: dualData.bookSynthesisByBook,
      blueprintStatus: dualData.blueprintStatus,
      variants: dualData.variants,
    });

    return (
      <ProjectOverviewPage
        sessionId={dualData.session.id}
        sessionName={dualData.session.name}
        overview={overview}
        books={dualData.books}
      />
    );
  }

  const singleData = await loadSingleSessionPageData({
    supabase,
    sessionId: id,
    userId: user.id,
  });
  if (!singleData) notFound();

  const {
    session,
    book,
    llmConfigured,
    chapterCount,
    safeAnalyses,
    safeExtendedAnalyses,
    safeVariants,
  } = singleData;
  const metadata = book.metadata ?? {};
  const hasCompleteAnalysis = safeAnalyses.length === 3;
  const hasVariants = safeVariants.length > 0;
  const currentStepDescription = !hasCompleteAnalysis
    ? llmConfigured
      ? "完成三项分析后可生成"
      : "需先配置模型"
    : hasVariants
      ? "结果已生成，可继续查看或再生成一个版本"
      : "分析已准备好，可直接生成结果";
  const stageItems = getStageItems({
    hasCompleteAnalysis,
    variantCount: safeVariants.length,
  });
  const headerAction = !llmConfigured ? (
    <Button asChild>
      <Link href="/settings">
        <Settings2 aria-hidden="true" />
        去设置
      </Link>
    </Button>
  ) : null;

  return (
    <div className="app-page">
      <PageHeader
        label="session"
        title={book.title}
        description={currentStepDescription}
        action={headerAction}
        meta={
          <MetaRow
            items={[
              { label: "uploaded", value: formatDate(book.created_at) },
              {
                label: "updated",
                value: formatRelativeTime(session.updated_at),
              },
            ]}
          />
        }
      />

      <WorkflowStageBar items={stageItems} />

      <MetaRow
        items={[
          {
            label: "words",
            value: book.word_count?.toLocaleString("zh-CN") ?? "0",
          },
          { label: "chapters", value: String(chapterCount) },
          { label: "encoding", value: typeof metadata.encoding === "string" ? metadata.encoding : "未知" },
          { label: "analysis", value: `${safeAnalyses.length} / 3` },
        ]}
      />

      <section className="grid gap-9">
        <div className="surface-panel p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <p className="eyebrow-label">overview</p>
              <h2 className="mt-2 font-display text-[24px] italic leading-tight text-foreground">
                任务概览
              </h2>
              <p className="mt-3 max-w-3xl text-[13.5px] leading-7 text-muted-foreground">
                当前版本先围绕单份文本建立完整的研究与生成路径。后续多书对比、双视角分析和来源映射会接入同一块结构。
              </p>
            </div>
            <div className="surface-subtle p-4">
              <p className="data-label">{"// current state"}</p>
              <p className="mt-2 font-display text-[18px] italic text-foreground">
                {getStageSummary(hasCompleteAnalysis, hasVariants)}
              </p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                analysis {safeAnalyses.length}/3 · variants{" "}
                {safeVariants.length}
              </p>
            </div>
          </div>
        </div>

        {hasCompleteAnalysis ? (
          <>
            <GeneratePanel
              sessionId={session.id}
              sessionStatus={session.status}
              llmConfigured={llmConfigured}
              hasCompleteAnalysis={hasCompleteAnalysis}
              variantCount={safeVariants.length}
            />
            {hasVariants ? <VariantList variants={safeVariants} /> : null}
            <AnalysisPanel
              sessionId={session.id}
              analyses={safeAnalyses}
              llmConfigured={llmConfigured}
              sessionStatus={session.status}
            />
            <ExtendedAnalysisPanel
              bookId={book.id}
              analyses={safeExtendedAnalyses}
              llmConfigured={llmConfigured}
              disabled={session.status === "generating"}
            />
          </>
        ) : (
          <AnalysisPanel
            sessionId={session.id}
            analyses={safeAnalyses}
            llmConfigured={llmConfigured}
            sessionStatus={session.status}
          />
        )}
      </section>
    </div>
  );
}

function getStageItems({
  hasCompleteAnalysis,
  variantCount,
}: {
  hasCompleteAnalysis: boolean;
  variantCount: number;
}): WorkflowStageItem[] {
  const hasResults = variantCount > 0;

  return [
    {
      key: "upload",
      label: "文本已导入",
      description: "文件已经进入当前任务。",
      state: "done",
    },
    {
      key: "analysis",
      label: "完成分析",
      description: hasCompleteAnalysis
        ? "三项分析已经准备好。"
        : "先完成世界观、人物和叙事分析。",
      state: hasCompleteAnalysis ? "done" : "current",
    },
    {
      key: "generate",
      label: "生成结果",
      description: hasResults
        ? `已保存 ${variantCount} 个版本。`
        : hasCompleteAnalysis
          ? "现在可以生成第一个版本。"
          : "等待分析完成后再开始。",
      state: hasResults ? "done" : hasCompleteAnalysis ? "current" : "upcoming",
    },
  ];
}

function getStageSummary(hasCompleteAnalysis: boolean, hasVariants: boolean) {
  if (hasVariants) return "结果已生成";
  if (hasCompleteAnalysis) return "等待生成";
  return "等待分析完成";
}
