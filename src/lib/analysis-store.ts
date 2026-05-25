import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

type AnalysisInsert = Database["public"]["Tables"]["analyses"]["Insert"];
type AnalysisUpdate = Database["public"]["Tables"]["analyses"]["Update"];

type SaveAnalysisInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  bookId: string;
  dimension: AnalysisInsert["dimension"];
  scope: "book" | "chapter";
  chapterId?: string | null;
  result: unknown;
  llmConfigId: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  promptVersion?: string | null;
  schemaVersion?: string | null;
  estimatedCostCNY?: number | null;
  cacheKey?: string | null;
};

export async function saveAnalysis(input: SaveAnalysisInput) {
  const matchQuery = input.supabase
    .from("analyses")
    .select("id")
    .eq("book_id", input.bookId)
    .eq("user_id", input.userId)
    .eq("scope", input.scope)
    .eq("dimension", input.dimension);

  const scopedQuery =
    input.scope === "chapter" && input.chapterId
      ? matchQuery.eq("chapter_id", input.chapterId)
      : matchQuery.is("chapter_id", null);

  const { data: existing, error: existingError } =
    await scopedQuery.maybeSingle();
  if (existingError) {
    return { error: existingError };
  }

  const updatePayload: AnalysisUpdate = {
    result: input.result,
    prompt_tokens: input.promptTokens ?? null,
    completion_tokens: input.completionTokens ?? null,
    prompt_version: input.promptVersion ?? null,
    schema_version: input.schemaVersion ?? null,
    estimated_cost_cny: input.estimatedCostCNY ?? null,
    cache_key: input.cacheKey ?? null,
  };

  if (existing?.id) {
    return await input.supabase
      .from("analyses")
      .update(updatePayload)
      .eq("id", existing.id)
      .eq("user_id", input.userId);
  }

  const insertPayload: AnalysisInsert = {
    book_id: input.bookId,
    user_id: input.userId,
    scope: input.scope,
    chapter_id: input.scope === "chapter" ? (input.chapterId ?? null) : null,
    dimension: input.dimension,
    result: input.result,
    llm_config_id: input.llmConfigId,
    prompt_tokens: input.promptTokens ?? null,
    completion_tokens: input.completionTokens ?? null,
    prompt_version: input.promptVersion ?? null,
    schema_version: input.schemaVersion ?? null,
    estimated_cost_cny: input.estimatedCostCNY ?? null,
    cache_key: input.cacheKey ?? null,
  };

  return await input.supabase.from("analyses").insert(insertPayload);
}
