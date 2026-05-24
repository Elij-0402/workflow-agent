import type { SupabaseClient } from "@supabase/supabase-js";

import { BlueprintSchema, emptyBlueprint } from "@/lib/blueprint/schema";
import {
  ANALYSIS_DIMENSION_CONFIG,
  EXTENDED_ANALYSIS_DIMENSION_CONFIG,
} from "@/lib/prompts";
import { ChapterBriefResultSchema } from "@/lib/types";
import type {
  ChapterBriefResult,
  Database,
  ExtendedAnalysisDimension,
  LegacyAnalysisDimension,
  SessionStatus,
  VariantRow,
} from "@/lib/types";

type BookMetadata = {
  encoding?: string;
  chapters?: unknown[];
  ingest_status?: string;
};

export type DualSessionPageData = {
  session: { id: string; name: string; mode: "single" | "dual"; created_at: string; updated_at: string };
  books: Array<{
    id: string;
    title: string;
    position: number;
    word_count: number | null;
    chapter_count: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  chapters: Array<{
    id: string;
    book_id: string;
    index: number;
    title: string;
    start_char: number;
    end_char: number;
    source: "regex" | "length-chunk" | "manual";
  }>;
  briefs: Array<{
    book_id: string;
    chapter_id: string;
    dimension: "chapter_brief" | "block_brief";
    result: ChapterBriefResult;
  }>;
  bookSynthesisByBook: string[];
  blueprintId: string | null;
  blueprintStatus: "draft" | "confirmed";
  blueprintUpdatedAt: string | null;
  blueprintConfirmedAt: string | null;
  blueprint: ReturnType<typeof emptyBlueprint>;
  variants: Array<
    Pick<
      VariantRow,
      "id" | "title" | "scope" | "config" | "content" | "word_count" | "blueprint_id" | "created_at" | "chapter_index"
    >
  >;
  llmConfigured: boolean;
  extendedAnalysesByBook: Record<
    string,
    Array<{ dimension: ExtendedAnalysisDimension; result: unknown }>
  >;
};

export type SingleSessionPageData = {
  session: { id: string; name: string; status: SessionStatus; created_at: string; updated_at: string };
  book: {
    id: string;
    title: string;
    word_count: number | null;
    chapter_count: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
  };
  llmConfigured: boolean;
  chapterCount: number;
  safeAnalyses: Array<{ dimension: LegacyAnalysisDimension; result: unknown }>;
  safeExtendedAnalyses: Array<{ dimension: ExtendedAnalysisDimension; result: unknown }>;
  safeVariants: Array<
    Pick<
      VariantRow,
      "id" | "title" | "config" | "content" | "word_count" | "created_at" | "scope" | "chapter_index"
    >
  >;
};

export async function loadDualSessionPageData(params: {
  supabase: SupabaseClient<Database>;
  sessionId: string;
  userId: string;
}): Promise<DualSessionPageData | null> {
  const { supabase, sessionId, userId } = params;
  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, mode, created_at, updated_at")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!session) return null;

  const { data: books } = await supabase
    .from("books")
    .select("id, title, position, word_count, chapter_count, metadata, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("position", { ascending: true });

  const bookIds = (books ?? []).map((book) => book.id);
  const [chaptersResult, analysesResult, blueprintResult, variantsResult, llmConfigResult] =
    await Promise.all([
    bookIds.length
      ? supabase
          .from("chapters")
          .select("id, book_id, index, title, start_char, end_char, source")
          .in("book_id", bookIds)
          .eq("user_id", userId)
          .order("index", { ascending: true })
      : Promise.resolve({ data: [] as const }),
    bookIds.length
      ? supabase
          .from("analyses")
          .select("book_id, chapter_id, scope, dimension, result")
          .in("book_id", bookIds)
          .eq("user_id", userId)
      : Promise.resolve({ data: [] as const }),
    supabase
      .from("blueprints")
      .select("id, status, sections, confirmed_at, updated_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("variants")
      .select("id, title, scope, config, content, word_count, blueprint_id, created_at, chapter_index")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("llm_config").select("id").maybeSingle(),
  ]);

  const chapters = (chaptersResult.data ?? []) as DualSessionPageData["chapters"];
  const analyses = (analysesResult.data ?? []) as Array<{
    book_id: string;
    chapter_id: string | null;
    scope: "book" | "chapter";
    dimension: string;
    result: unknown;
  }>;

  const briefs = analyses
    .filter(
      (analysis) =>
        analysis.scope === "chapter" &&
        (analysis.dimension === "chapter_brief" || analysis.dimension === "block_brief") &&
        analysis.chapter_id,
    )
    .map((analysis) => {
      const parsed = ChapterBriefResultSchema.safeParse(analysis.result);
      return parsed.success
        ? {
            book_id: analysis.book_id,
            chapter_id: analysis.chapter_id as string,
            dimension: analysis.dimension as "chapter_brief" | "block_brief",
            result: parsed.data,
          }
        : null;
    })
    .filter((brief): brief is DualSessionPageData["briefs"][number] => brief !== null);

  const bookSynthesisByBook = [
    ...new Set(
      analyses
        .filter((analysis) => analysis.scope === "book" && analysis.dimension === "book_synthesis")
        .map((analysis) => analysis.book_id),
    ),
  ];

  const extendedAnalysesByBook: DualSessionPageData["extendedAnalysesByBook"] = {};
  for (const bookId of bookIds) {
    extendedAnalysesByBook[bookId] = analyses
      .filter(
        (analysis) =>
          analysis.book_id === bookId &&
          analysis.scope === "book" &&
          analysis.dimension in EXTENDED_ANALYSIS_DIMENSION_CONFIG &&
          analysis.result,
      )
      .flatMap((analysis) => {
        const dimension = analysis.dimension as ExtendedAnalysisDimension;
        const config = EXTENDED_ANALYSIS_DIMENSION_CONFIG[dimension];
        if (!config || !config.schema.safeParse(analysis.result).success) return [];
        return [{ dimension, result: analysis.result }];
      });
  }

  const blueprintRow = blueprintResult.data;

  return {
    session: session as DualSessionPageData["session"],
    books: (books ?? []) as DualSessionPageData["books"],
    chapters,
    briefs,
    bookSynthesisByBook,
    blueprintId: blueprintRow?.id ?? null,
    blueprintStatus: blueprintRow?.status ?? "draft",
    blueprintUpdatedAt: blueprintRow?.updated_at ?? null,
    blueprintConfirmedAt: blueprintRow?.confirmed_at ?? null,
    blueprint: blueprintRow ? BlueprintSchema.parse(blueprintRow.sections ?? {}) : emptyBlueprint(),
    variants: (variantsResult.data ?? []) as DualSessionPageData["variants"],
    llmConfigured: Boolean(llmConfigResult.data),
    extendedAnalysesByBook,
  };
}

export async function loadSingleSessionPageData(params: {
  supabase: SupabaseClient<Database>;
  sessionId: string;
  userId: string;
}): Promise<SingleSessionPageData | null> {
  const { supabase, sessionId, userId } = params;
  const [{ data: session }, { data: book }, { data: llmConfig }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, name, status, created_at, updated_at")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("books")
      .select("id, title, word_count, chapter_count, metadata, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("llm_config").select("id").maybeSingle(),
  ]);

  if (!session || !book) return null;

  const { data: analyses } = await supabase
    .from("analyses")
    .select("dimension, result")
    .eq("user_id", userId)
    .eq("book_id", book.id)
    .order("created_at", { ascending: true });

  const { data: variants } = await supabase
    .from("variants")
    .select("id, title, config, content, word_count, created_at, scope, chapter_index")
    .eq("session_id", session.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const metadata = (book.metadata ?? {}) as BookMetadata;
  const chapterCount =
    book.chapter_count ??
    (Array.isArray(metadata.chapters) ? metadata.chapters.length : 0);

  const safeAnalyses = (analyses ?? []).filter(
    (item): item is SingleSessionPageData["safeAnalyses"][number] => {
      if (!item.dimension || !item.result) return false;
      const config = ANALYSIS_DIMENSION_CONFIG[item.dimension as LegacyAnalysisDimension];
      if (!config) return false;
      return config.schema.safeParse(item.result).success;
    },
  );

  const safeExtendedAnalyses = (analyses ?? []).filter(
    (item): item is SingleSessionPageData["safeExtendedAnalyses"][number] => {
      if (!item.dimension || !item.result) return false;
      const config =
        EXTENDED_ANALYSIS_DIMENSION_CONFIG[item.dimension as ExtendedAnalysisDimension];
      if (!config) return false;
      return config.schema.safeParse(item.result).success;
    },
  );

  return {
    session: session as SingleSessionPageData["session"],
    book: book as SingleSessionPageData["book"],
    llmConfigured: Boolean(llmConfig),
    chapterCount,
    safeAnalyses,
    safeExtendedAnalyses,
    safeVariants: (variants ?? []) as SingleSessionPageData["safeVariants"],
  };
}
