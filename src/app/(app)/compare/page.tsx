import Link from "next/link";

import { CompareClient } from "./CompareClient";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { safeGetUser } from "@/lib/supabase/auth";
import type { AnalysisDimension } from "@/lib/types";

type SearchParams = Promise<{ sessionIds?: string | string[] }>;

function normalizeIds(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const flat = Array.isArray(raw) ? raw : [raw];
  return Array.from(
    new Set(
      flat
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedSessionIds = normalizeIds(params.sessionIds);

  const supabase = await createClient();
  const { user } = await safeGetUser(supabase, "compare-page");

  const sessionsResult = user
    ? await supabase
        .from("sessions")
        .select("id, name, mode, updated_at, archived_at")
        .eq("user_id", user.id)
        .eq("mode", "dual")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(8)
    : { data: [] };

  const sessions = sessionsResult.data ?? [];
  const effectiveSessionIds =
    selectedSessionIds.length > 0
      ? selectedSessionIds
      : sessions.slice(0, 1).map((session) => session.id);

  const booksResult =
    user && effectiveSessionIds.length > 0
      ? await supabase
          .from("books")
          .select("id, session_id, title, word_count, chapter_count")
          .eq("user_id", user.id)
          .in("session_id", effectiveSessionIds)
          .order("position", { ascending: true })
      : { data: [] };

  const books = booksResult.data ?? [];
  const bookIds = books.map((book) => book.id);

  const analysesResult =
    user && bookIds.length > 0
      ? await supabase
          .from("analyses")
          .select("book_id, dimension, scope, result")
          .eq("user_id", user.id)
          .eq("scope", "book")
          .in("book_id", bookIds)
      : { data: [] };

  const analyses = analysesResult.data ?? [];
  const analysisMap = new Map<string, Partial<Record<AnalysisDimension, unknown>>>();
  for (const analysis of analyses) {
    const current = analysisMap.get(analysis.book_id) ?? {};
    current[analysis.dimension as AnalysisDimension] = analysis.result;
    analysisMap.set(analysis.book_id, current);
  }

  const compareBooks = books.map((book) => ({
    bookId: book.id,
    sessionId: book.session_id,
    displayTitle: book.title,
    wordCount: book.word_count,
    chapterCount: book.chapter_count,
    analyses: analysisMap.get(book.id) ?? {},
  }));

  return (
    <div className="app-page">
      <PageHeader
        label="对比"
        title="从双书项目进入分析图谱"
        description="先选择一个或多个双书项目，再在这里并排查看世界观、人物、叙事与扩展分析。对比页现在是项目入口，而不是跳转中转站。"
        action={
          <Button asChild variant="outline">
            <Link href="/sessions">返回项目</Link>
          </Button>
        }
      />

      <section className="surface-panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow-label">项目选择</p>
            <h2 className="mt-2 text-[20px] font-semibold text-foreground">
              选择要展开的双书项目
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              点击卡片切换项目。当前支持把多个项目的参考书一起放进图谱里看。
            </p>
          </div>
          <p className="text-[12px] text-muted-foreground">
            已选 {effectiveSessionIds.length} 个项目
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {sessions.map((session) => {
            const active = effectiveSessionIds.includes(session.id);
            const nextIds = active
              ? effectiveSessionIds.filter((id) => id !== session.id)
              : [...effectiveSessionIds, session.id];
            const href =
              nextIds.length > 0
                ? `/compare?sessionIds=${nextIds.join(",")}`
                : "/compare";
            return (
              <Link
                key={session.id}
                href={href}
                className={
                  active
                    ? "rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-[13px] text-primary"
                    : "rounded-md border border-border bg-card px-4 py-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                }
              >
                {session.name}
              </Link>
            );
          })}
        </div>
      </section>

      {compareBooks.length > 0 ? (
        <CompareClient books={compareBooks} />
      ) : (
        <div className="surface-panel px-6 py-12 text-center text-[13px] leading-7 text-muted-foreground">
          先选择至少一个双书项目，再展开分析图谱。
        </div>
      )}
    </div>
  );
}
