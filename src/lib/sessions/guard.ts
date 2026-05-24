import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

type GuardResult = { ok: true } | { ok: false; status: number; message: string };

export function rejectArchivedSession(
  session: { archived_at?: string | null } | null,
): GuardResult {
  if (!session) {
    return { ok: false, status: 404, message: "未找到对应项目。" };
  }
  if (session.archived_at) {
    return { ok: false, status: 409, message: "项目已归档，请先恢复后再操作。" };
  }
  return { ok: true };
}

export async function loadActiveSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  userId: string,
) {
  const { data: session, error } = await supabase
    .from("sessions")
    .select("id, status, mode, archived_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { session: null, guard: { ok: false as const, status: 500, message: "读取项目失败。" } };
  }

  const guard = rejectArchivedSession(session);
  if (!guard.ok) {
    return { session: null, guard };
  }

  return { session, guard: { ok: true as const } };
}

export async function loadActiveSessionByBookId(
  supabase: SupabaseClient<Database>,
  bookId: string,
  userId: string,
) {
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, session_id")
    .eq("id", bookId)
    .eq("user_id", userId)
    .maybeSingle();

  if (bookError || !book) {
    return {
      session: null,
      book: null,
      guard: { ok: false as const, status: 404, message: "未找到书籍。" },
    };
  }

  const { session, guard } = await loadActiveSession(supabase, book.session_id, userId);
  return { session, book, guard };
}
