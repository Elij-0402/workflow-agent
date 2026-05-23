import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { BookOpenText, BrainCircuit, FileType2, TextQuote } from "lucide-react";

import { AnalysisPanel } from "./analysis-panel";
import { GeneratePanel } from "@/components/sessions/generate-panel";
import { VariantList } from "@/components/sessions/variant-list";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisDimension, VariantRow } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { getSessionStatusMeta, StatusDot } from "@/components/status-dot";

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

  const status = getSessionStatusMeta(session.status);
  const metadata = (book.metadata ?? {}) as BookMetadata;
  const chapterCount =
    book.chapter_count ?? (Array.isArray(metadata.chapters) ? metadata.chapters.length : 0);
  const safeAnalyses = ((analyses ?? []).filter(
    (item) => item.dimension && item.result
  ) as {
    dimension: AnalysisDimension;
    result: unknown;
  }[]);
  const safeVariants = (variants ?? []) as Array<
    Pick<VariantRow, "id" | "title" | "config" | "content" | "word_count" | "created_at">
  >;
  const hasCompleteAnalysis = safeAnalyses.length === 3;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <div className="max-w-3xl space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
            会话详情
          </p>
          <Badge variant="outline" className="gap-2 border-border/70 bg-background/30">
            <StatusDot status={session.status} />
            <span className={status.tone}>{status.label}</span>
          </Badge>
        </div>
        <h1 className="text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">
          {book.title}
        </h1>
        <p className="text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
          上传时间 {formatDate(book.created_at)}。当前分析固定基于前约 8 万字符，适合先验证整体质量与可用性。
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          icon={<TextQuote className="h-4 w-4" />}
          label="字数"
          value={book.word_count?.toLocaleString("zh-CN") ?? "0"}
        />
        <InfoCard
          icon={<BookOpenText className="h-4 w-4" />}
          label="章节数"
          value={String(chapterCount)}
        />
        <InfoCard
          icon={<FileType2 className="h-4 w-4" />}
          label="编码"
          value={metadata.encoding ?? "未知"}
        />
        <InfoCard
          icon={<BrainCircuit className="h-4 w-4" />}
          label="已完成维度"
          value={`${analyses?.length ?? 0} / 3`}
        />
      </section>

      <AnalysisPanel
        sessionId={session.id}
        analyses={safeAnalyses}
        llmConfigured={Boolean(llmConfig)}
      />

      <GeneratePanel
        sessionId={session.id}
        sessionStatus={session.status}
        llmConfigured={Boolean(llmConfig)}
        hasCompleteAnalysis={hasCompleteAnalysis}
        variantCount={safeVariants.length}
      />

      <VariantList sessionStatus={session.status} variants={safeVariants} />
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card/30 px-5 py-4">
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </div>
      <div className="mt-3 text-[24px] font-medium text-foreground">{value}</div>
    </div>
  );
}
