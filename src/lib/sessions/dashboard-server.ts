import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

import {
  deriveDashboardSummary,
  deriveSessionDashboard,
  type SessionDashboardItem,
  type SessionDashboardSeed,
} from "./dashboard";

type DashboardView = "active" | "archived";

export async function loadSessionDashboard(params: {
  supabase: SupabaseClient<Database>;
  userId: string;
  view: DashboardView;
}) {
  const { supabase, userId, view } = params;
  const baseQuery = supabase
    .from("sessions")
    .select("id, name, status, mode, archived_at, created_at, updated_at")
    .eq("user_id", userId);

  const { data: sessions } =
    view === "archived"
      ? await baseQuery
          .not("archived_at", "is", null)
          .order("archived_at", { ascending: false })
      : await baseQuery
          .is("archived_at", null)
          .order("updated_at", { ascending: false });

  const sessionRows = sessions ?? [];
  const sessionIds = sessionRows.map((session) => session.id);
  if (sessionIds.length === 0) {
    return {
      sessions: [] as SessionDashboardItem[],
      summary: deriveDashboardSummary([]),
      recentEvents: [] as Array<{ id: string; label: string; detail: string }>,
    };
  }

  const [
    booksResult,
    analysesResult,
    blueprintsResult,
    variantsResult,
    briefsResult,
  ] = await Promise.all([
    supabase
      .from("books")
      .select("id, session_id, chapter_count")
      .eq("user_id", userId)
      .in("session_id", sessionIds),
    supabase
      .from("analyses")
      .select("book_id, dimension")
      .eq("user_id", userId)
      .eq("scope", "book")
      .eq("dimension", "book_synthesis"),
    supabase
      .from("blueprints")
      .select("session_id, status")
      .eq("user_id", userId)
      .in("session_id", sessionIds),
    supabase
      .from("variants")
      .select("session_id, scope, title, created_at")
      .eq("user_id", userId)
      .in("session_id", sessionIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("creative_briefs")
      .select("session_id, status, updated_at")
      .eq("user_id", userId)
      .in("session_id", sessionIds),
  ]);

  const books = booksResult.data ?? [];
  const analyses = analysesResult.data ?? [];
  const blueprints = blueprintsResult.data ?? [];
  const variants = variantsResult.data ?? [];
  const briefs = briefsResult.data ?? [];

  const bookIdsToSession = new Map<string, string>();
  const bySession = new Map<
    string,
    {
      books: typeof books;
      analyzedBookIds: Set<string>;
      blueprintStatus: "draft" | "confirmed" | null;
      activeBriefCount: number;
      variantCount: number;
      lastActivityLabel: string | null;
    }
  >();

  for (const session of sessionRows) {
    bySession.set(session.id, {
      books: [],
      analyzedBookIds: new Set<string>(),
      blueprintStatus: null,
      activeBriefCount: 0,
      variantCount: 0,
      lastActivityLabel: null,
    });
  }

  for (const book of books) {
    bookIdsToSession.set(book.id, book.session_id);
    bySession.get(book.session_id)?.books.push(book);
  }

  for (const analysis of analyses) {
    const sessionId = bookIdsToSession.get(analysis.book_id);
    if (!sessionId) continue;
    bySession.get(sessionId)?.analyzedBookIds.add(analysis.book_id);
  }

  for (const blueprint of blueprints) {
    const entry = bySession.get(blueprint.session_id);
    if (!entry) continue;
    entry.blueprintStatus = blueprint.status;
  }

  for (const brief of briefs) {
    const entry = bySession.get(brief.session_id);
    if (!entry) continue;
    if (brief.status === "active") entry.activeBriefCount += 1;
  }

  for (const variant of variants) {
    if (variant.scope !== "full") continue;
    const entry = bySession.get(variant.session_id);
    if (!entry) continue;
    entry.variantCount += 1;
  }

  const items = sessionRows.map((session) => {
    const entry = bySession.get(session.id);
    const seed: SessionDashboardSeed = {
      ...session,
      bookCount: entry?.books.length ?? 0,
      chapterCount:
        entry?.books.reduce(
          (sum, book) => sum + (book.chapter_count ?? 0),
          0,
        ) ?? 0,
      analyzedBookCount: entry?.analyzedBookIds.size ?? 0,
      blueprintStatus: entry?.blueprintStatus ?? null,
      activeBriefCount: entry?.activeBriefCount ?? 0,
      variantCount: entry?.variantCount ?? 0,
      lastActivityLabel: deriveLastActivityLabel({
        variantCount: entry?.variantCount ?? 0,
        activeBriefCount: entry?.activeBriefCount ?? 0,
        blueprintStatus: entry?.blueprintStatus ?? null,
        analyzedBookCount: entry?.analyzedBookIds.size ?? 0,
        bookCount: entry?.books.length ?? 0,
      }),
    };

    return deriveSessionDashboard(seed);
  });

  const recentEvents = items.slice(0, 4).map((item) => ({
    id: item.id,
    label: item.lastActivityLabel,
    detail: `${item.name} · ${item.stageLabel}`,
  }));

  return {
    sessions: items,
    summary: deriveDashboardSummary(items),
    recentEvents,
  };
}

function deriveLastActivityLabel(input: {
  variantCount: number;
  activeBriefCount: number;
  blueprintStatus: "draft" | "confirmed" | null;
  analyzedBookCount: number;
  bookCount: number;
}) {
  if (input.variantCount > 0) return "生成结果已保存";
  if (input.activeBriefCount > 0) return "创意简报已就位";
  if (input.blueprintStatus === "confirmed") return "蓝图已确认";
  if (input.blueprintStatus === "draft" && input.analyzedBookCount === 2) {
    return "等待确认蓝图";
  }
  if (input.analyzedBookCount > 0) return "整书分析进行中";
  if (input.bookCount > 0) return "参考书已导入";
  return null;
}
