import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import { AnalysisPanel } from "./analysis-panel";
import { ExtendedAnalysisPanel } from "./extended-analysis-panel";
import {
  loadDualSessionPageData,
  loadSingleSessionPageData,
} from "./page-data";
import { getBookIngestStatus, isBookIngestReady } from "@/lib/books/content";
import { ImportHealthPanel } from "@/components/projects/import-health-panel";
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
  searchParams: Promise<{
    step?: string;
    panel?: string;
    view?: string;
  }>;
};

export default async function SessionDetailPage({
  params,
  searchParams,
}: SessionPageProps) {
  const { id } = await params;
  const query = await searchParams;
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
    const legacyTarget = getDualWorkbenchRedirect(query);
    if (legacyTarget) {
      redirect(`/sessions/${id}/workbench${legacyTarget}`);
    }

    if (query.view !== "overview") {
      redirect(`/sessions/${id}/workbench`);
    }

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
        llmConfigured={dualData.llmConfigured}
        extendedAnalysisDisabled={dualData.session.status === "generating"}
        books={dualData.books.map((book) => ({
          ...book,
          extendedAnalyses: dualData.extendedAnalysesByBook[book.id] ?? [],
        }))}
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
  const ingestStatus = getBookIngestStatus(metadata);
  const ingestReady = isBookIngestReady(metadata);
  const hasCompleteAnalysis = safeAnalyses.length === 3;
  const hasVariants = safeVariants.length > 0;
  const currentStepDescription = !ingestReady
    ? "原始文件已导入，正在整理正文、章节与导入体检"
    : !hasCompleteAnalysis
      ? llmConfigured
        ? "完成三项分析后可生成"
        : "需先配置模型"
      : hasVariants
        ? "结果已生成，可继续查看或再生成一个版本"
        : "分析已准备好，可直接生成结果";
  const stageItems = getStageItems({
    ingestReady,
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
        label="项目"
        title={book.title}
        description={currentStepDescription}
        action={headerAction}
        meta={
          <MetaRow
            items={[
              { label: "导入时间", value: formatDate(book.created_at) },
              {
                label: "最近更新",
                value: formatRelativeTime(session.updated_at),
              },
            ]}
          />
        }
      />

      <WorkflowStageBar items={stageItems} />

      <section className="grid gap-9">
        <div className="surface-panel p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <p className="eyebrow-label">概览</p>
              <h2 className="mt-2 font-display text-[24px] italic leading-tight text-foreground">
                项目总览
              </h2>
              <p className="mt-3 max-w-3xl text-[13.5px] leading-7 text-muted-foreground">
                当前是单书兼容模式，仍然沿用同一条项目主线：分析、判断、生成结果。后续多书对比和蓝图能力会优先落在双书项目里。
              </p>
            </div>
            <div className="surface-subtle p-4">
              <p className="data-label">当前状态</p>
              <p className="mt-2 font-display text-[18px] italic text-foreground">
                {getStageSummary(hasCompleteAnalysis, hasVariants)}
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                分析进度 {safeAnalyses.length}/3 · 版本数 {safeVariants.length}
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                导入状态 · {ingestStatus}
              </p>
            </div>
          </div>
        </div>

        <ImportHealthPanel
          books={[
            {
              id: book.id,
              title: book.title,
              metadata: book.metadata,
            },
          ]}
        />

        {hasCompleteAnalysis ? (
          <>
            <AnalysisPanel
              sessionId={session.id}
              analyses={safeAnalyses}
              llmConfigured={llmConfigured}
              sessionStatus={session.status}
            />
            <GeneratePanel
              sessionId={session.id}
              sessionStatus={session.status}
              llmConfigured={llmConfigured}
              hasCompleteAnalysis={hasCompleteAnalysis}
              variantCount={safeVariants.length}
            />
            {hasVariants ? <VariantList variants={safeVariants} /> : null}
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

function getDualWorkbenchRedirect(query: { step?: string; panel?: string }) {
  if (query.panel === "results") {
    return "?step=generate";
  }

  if (
    query.step === "upload" ||
    query.step === "analysis" ||
    query.step === "compare" ||
    query.step === "generate"
  ) {
    return `?step=${query.step}`;
  }

  return null;
}

function getStageItems({
  ingestReady,
  hasCompleteAnalysis,
  variantCount,
}: {
  ingestReady: boolean;
  hasCompleteAnalysis: boolean;
  variantCount: number;
}): WorkflowStageItem[] {
  const hasResults = variantCount > 0;

  return [
    {
      key: "upload",
      label: ingestReady ? "文本已导入" : "正在整理文本",
      description: ingestReady
        ? "文件已经进入当前任务。"
        : "原文已接收，正在完成清洗与切章。",
      state: ingestReady ? "done" : "current",
    },
    {
      key: "analysis",
      label: "完成分析",
      description: hasCompleteAnalysis
        ? "三项分析已经准备好。"
        : ingestReady
          ? "先完成世界观、人物和叙事分析。"
          : "等待文本整理完成后再开始分析。",
      state: hasCompleteAnalysis
        ? "done"
        : ingestReady
          ? "current"
          : "upcoming",
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
