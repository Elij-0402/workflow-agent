import { notFound } from "next/navigation";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import { AnalysisPanel } from "./analysis-panel";
import { GeneratePanel } from "@/components/sessions/generate-panel";
import { VariantList } from "@/components/sessions/variant-list";
import { MetaRow } from "@/components/meta-row";
import { PageHeader } from "@/components/page-header";
import { WorkflowStageBar, type WorkflowStageItem } from "@/components/workflow-stage-bar";
import { Button } from "@/components/ui/button";
import { ANALYSIS_DIMENSION_CONFIG } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisDimension, VariantRow } from "@/lib/types";
import { formatDate, formatRelativeTime } from "@/lib/utils";

type SessionPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type BookMetadata = {
  encoding?: string;
  chapters?: unknown[];
};

export default async function SessionDetailPage({ params }: SessionPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const [{ data: session }, { data: book }, { data: llmConfig }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, name, status, created_at, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("books")
      .select("id, title, word_count, chapter_count, metadata, created_at")
      .eq("session_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("llm_config").select("id").maybeSingle(),
  ]);

  if (!session || !book) {
    notFound();
  }

  const { data: analyses } = await supabase
    .from("analyses")
    .select("dimension, result")
    .eq("user_id", user.id)
    .eq("book_id", book.id)
    .order("created_at", { ascending: true });

  const { data: variants } = await supabase
    .from("variants")
    .select("id, title, config, content, word_count, created_at")
    .eq("session_id", session.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const metadata = (book.metadata ?? {}) as BookMetadata;
  const chapterCount =
    book.chapter_count ?? (Array.isArray(metadata.chapters) ? metadata.chapters.length : 0);
  // Validate each stored analysis row against its current dimension schema.
  // Rows that fail safeParse (schema drift, partial writes, garbage from a
  // misbehaving model) are dropped here so the UI treats them as "not yet
  // analyzed" — the user can re-run the dimension cleanly instead of seeing
  // half-rendered or "undefined" copy from a stale shape.
  const safeAnalyses = ((analyses ?? []).filter((item): item is {
    dimension: AnalysisDimension;
    result: unknown;
  } => {
    if (!item.dimension || !item.result) return false;
    const config = ANALYSIS_DIMENSION_CONFIG[item.dimension as AnalysisDimension];
    if (!config) return false;
    return config.schema.safeParse(item.result).success;
  }));
  const safeVariants = (variants ?? []) as Array<
    Pick<VariantRow, "id" | "title" | "config" | "content" | "word_count" | "created_at">
  >;
  const hasCompleteAnalysis = safeAnalyses.length === 3;
  const hasVariants = safeVariants.length > 0;
  const currentStepDescription = !hasCompleteAnalysis
    ? Boolean(llmConfig)
      ? "先完成三项分析，再进入生成。"
      : "当前还不能开始分析，先去补上模型设置。"
    : hasVariants
      ? "结果已经生成完成。你可以继续查看，或再生成一个版本。"
      : "分析已经准备好，下一步直接生成结果。";
  const stageItems = getStageItems({
    hasCompleteAnalysis,
    variantCount: safeVariants.length,
  });
  const headerAction = !llmConfig ? (
    <Button asChild>
      <Link href="/settings">
        <Settings2 aria-hidden="true" />
        前往设置
      </Link>
    </Button>
  ) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-8 px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <PageHeader
        title={book.title}
        description={currentStepDescription}
        action={headerAction}
        meta={
          <MetaRow
            items={[
              { label: "上传时间", value: formatDate(book.created_at) },
              { label: "最近更新", value: formatRelativeTime(session.updated_at) },
            ]}
          />
        }
      />

      <WorkflowStageBar items={stageItems} />

      <MetaRow
        items={[
          { label: "字数", value: book.word_count?.toLocaleString("zh-CN") ?? "0" },
          { label: "章节", value: String(chapterCount) },
          { label: "编码", value: metadata.encoding ?? "未知" },
          { label: "分析进度", value: `${safeAnalyses.length} / 3` },
        ]}
      />

      {hasCompleteAnalysis ? (
        <>
          <GeneratePanel
            sessionId={session.id}
            sessionStatus={session.status}
            llmConfigured={Boolean(llmConfig)}
            hasCompleteAnalysis={hasCompleteAnalysis}
            variantCount={safeVariants.length}
          />
          {hasVariants ? <VariantList variants={safeVariants} /> : null}
          <AnalysisPanel
            sessionId={session.id}
            analyses={safeAnalyses}
            llmConfigured={Boolean(llmConfig)}
            sessionStatus={session.status}
          />
        </>
      ) : (
        <AnalysisPanel
          sessionId={session.id}
          analyses={safeAnalyses}
          llmConfigured={Boolean(llmConfig)}
          sessionStatus={session.status}
        />
      )}
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
