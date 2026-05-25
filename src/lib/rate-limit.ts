import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;

/**
 * Per-user rate limit gate.
 *
 * Known limitation — TOCTOU race: this is a read-then-decide check with no
 * atomicity against the usage-event insert that happens later in
 * runLLMObject. Concurrent requests fired within the same window can all
 * read the same pre-increment count and each pass the check, allowing the
 * cap to be exceeded by burst load. A true fix requires either a Postgres
 * function (e.g., advisory lock + insert in one round-trip) or a Redis
 * INCR-based primitive — both require a migration / infra change beyond
 * this module.
 */
export async function assertWithinRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  options?: { windowMs?: number; maxRequests?: number },
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const since = new Date(Date.now() - windowMs).toISOString();

  const { count, error } = await supabase
    .from("llm_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    console.error("[rate-limit] llm_usage_events query failed:", {
      code: (error as { code?: string }).code,
      message: error.message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    return { ok: false, status: 500, message: "无法校验调用频率。" };
  }

  if ((count ?? 0) >= maxRequests) {
    return {
      ok: false,
      status: 429,
      message: "调用过于频繁，请稍后再试。",
    };
  }

  return { ok: true };
}
