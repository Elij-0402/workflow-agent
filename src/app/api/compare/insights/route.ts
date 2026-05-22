import { NextResponse } from "next/server";
import { z } from "zod";

import { distanceFor } from "@/lib/compare/distance";
import { asLLMClientError } from "@/lib/llm/errors";
import { runLLMObject } from "@/lib/llm/runtime";
import { COMPARE_INSIGHTS_CONFIG } from "@/lib/prompts";
import { COMPARE_INSIGHT_DIMENSIONS } from "@/lib/prompts/compare-insights";
import { createClient } from "@/lib/supabase/server";
import { DIMENSION_LABELS, type AnalysisDimension } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_SESSIONS = 6;

const bodySchema = z.object({
  sessionIds: z.array(z.string().uuid()).min(2).max(MAX_SESSIONS),
});

const GENERIC_FAILURE = "生成对比洞察失败，请稍后重试。";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function summariseAnalysisForPrompt(dim: AnalysisDimension, result: unknown): unknown {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  switch (dim) {
    case "worldview":
      return {
        type: r.type,
        setting: r.setting,
        power_system: r.power_system,
        rules: r.rules,
        locations: Array.isArray(r.locations)
          ? (r.locations as Array<Record<string, unknown>>).map((l) => ({
              name: l.name,
              importance: l.importance,
            }))
          : [],
        summary: r.summary,
      };
    case "characters":
      return {
        character_count: Array.isArray(r.characters) ? r.characters.length : 0,
        roles: Array.isArray(r.characters)
          ? (r.characters as Array<{ role?: string; name?: string }>).map((c) => ({
              name: c.name,
              role: c.role,
            }))
          : [],
        relationship_count: Array.isArray(r.relationships) ? r.relationships.length : 0,
        summary: r.summary,
      };
    case "narrative":
      return {
        structure: r.structure,
        viewpoint: r.viewpoint,
        pacing: r.pacing,
        themes: r.themes,
        conflicts: r.conflicts,
        turning_points: Array.isArray(r.turning_points)
          ? (r.turning_points as Array<{ title?: string; impact?: number }>).map((t, i) => ({
              index: i,
              title: t.title,
              impact: t.impact,
            }))
          : [],
        summary: r.summary,
      };
    case "prose_craft":
      return {
        sentence_length: r.sentence_length,
        rhetoric_density: r.rhetoric_density,
        sensory_mix: r.sensory_mix,
        mode_balance: r.mode_balance,
        signature_techniques: r.signature_techniques,
        summary: r.summary,
      };
    case "emotion_arc": {
      const chapters = Array.isArray(r.chapters)
        ? (r.chapters as Array<Record<string, unknown>>)
        : [];
      const valences = chapters
        .map((c) => Number(c.valence))
        .filter((n) => Number.isFinite(n));
      const intensities = chapters
        .map((c) => Number(c.intensity))
        .filter((n) => Number.isFinite(n));
      return {
        chapter_count: chapters.length,
        valence_mean:
          valences.length === 0 ? 0 : valences.reduce((s, v) => s + v, 0) / valences.length,
        valence_min: valences.length === 0 ? 0 : Math.min(...valences),
        valence_max: valences.length === 0 ? 0 : Math.max(...valences),
        intensity_mean:
          intensities.length === 0
            ? 0
            : intensities.reduce((s, v) => s + v, 0) / intensities.length,
        peaks: Array.isArray(r.peaks) ? r.peaks : [],
        summary: r.summary,
      };
    }
    case "pacing_map": {
      const chapters = Array.isArray(r.chapters)
        ? (r.chapters as Array<Record<string, unknown>>)
        : [];
      const tally: Record<string, number> = { slow: 0, moderate: 0, fast: 0, burst: 0 };
      for (const c of chapters) {
        const t = String(c.tempo);
        if (t in tally) tally[t] += 1;
      }
      return {
        chapter_count: chapters.length,
        tempo_distribution: tally,
        tempo_shifts: r.tempo_shifts,
        summary: r.summary,
      };
    }
    case "suspense_grid": {
      const threads = Array.isArray(r.threads)
        ? (r.threads as Array<Record<string, unknown>>)
        : [];
      const kindTally: Record<string, number> = {
        foreshadow: 0,
        mystery: 0,
        deferred_promise: 0,
        red_herring: 0,
      };
      for (const t of threads) {
        const k = String(t.kind);
        if (k in kindTally) kindTally[k] += 1;
      }
      return {
        thread_count: threads.length,
        kind_distribution: kindTally,
        unresolved_count: Array.isArray(r.unresolved) ? r.unresolved.length : 0,
        summary: r.summary,
      };
    }
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return jsonError("请先登录。", 401);

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("请求参数不正确。", 400);
  }

  const sessionIds = Array.from(new Set(body.sessionIds)).slice(0, MAX_SESSIONS);

  const [{ data: sessions }, { data: books }] = await Promise.all([
    supabase.from("sessions").select("id, name, mode").in("id", sessionIds),
    supabase
      .from("books")
      .select("id, session_id, title, position")
      .in("session_id", sessionIds),
  ]);

  const safeSessions = sessions ?? [];
  const safeBooks = books ?? [];
  if (safeBooks.length < 2) {
    return jsonError("至少需要 2 本书的数据才能生成洞察。", 400);
  }

  const bookIds = safeBooks.map((b) => b.id);
  const { data: analyses } = await supabase
    .from("analyses")
    .select("book_id, dimension, result")
    .in("book_id", bookIds);

  const sessionById = new Map(safeSessions.map((s) => [s.id, s]));
  const analysesByBook = new Map<string, Map<AnalysisDimension, unknown>>();
  for (const a of analyses ?? []) {
    if (!a.book_id || !a.dimension) continue;
    const map = analysesByBook.get(a.book_id) ?? new Map();
    map.set(a.dimension as AnalysisDimension, a.result);
    analysesByBook.set(a.book_id, map);
  }

  const bookSummaries = safeBooks.map((b, i) => {
    const session = sessionById.get(b.session_id);
    const label = `BOOK ${String.fromCharCode(65 + i)}`;
    const dimensions: Record<string, unknown> = {};
    const bookAnalyses = analysesByBook.get(b.id) ?? new Map();
    for (const dim of COMPARE_INSIGHT_DIMENSIONS) {
      const result = bookAnalyses.get(dim);
      if (result === undefined) continue;
      dimensions[dim] = summariseAnalysisForPrompt(dim, result);
    }
    return {
      label,
      session_name: session?.name ?? "未命名项目",
      book_title: b.title,
      mode: session?.mode ?? "single",
      dimensions,
    };
  });

  const distances: Record<string, number | null> = {};
  for (const dim of COMPARE_INSIGHT_DIMENSIONS) {
    const results = safeBooks
      .map((b) => analysesByBook.get(b.id)?.get(dim))
      .filter((r): r is unknown => r !== undefined);
    distances[`${dim} (${DIMENSION_LABELS[dim]})`] = distanceFor(dim, results);
  }

  const payload = {
    book_count: safeBooks.length,
    distance_index: distances,
    books: bookSummaries,
  };

  const prompt = `以下是结构化的对比数据（JSON）。请输出 3-5 条 insight。

${JSON.stringify(payload, null, 2)}`;

  try {
    const result = await runLLMObject({
      supabase,
      route: "/api/compare/insights",
      operation: "compare_insights",
      schema: COMPARE_INSIGHTS_CONFIG.schema,
      system: COMPARE_INSIGHTS_CONFIG.systemPrompt,
      prompt,
      promptVersion: COMPARE_INSIGHTS_CONFIG.promptVersion,
      schemaVersion: COMPARE_INSIGHTS_CONFIG.schemaVersion,
      cacheSeed: {
        sessionIds,
        bookIds,
      },
    });

    return NextResponse.json({
      ok: true,
      insights: (result.object as { insights: unknown }).insights,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
    });
  } catch (e) {
    const clientError = asLLMClientError(e, {
      code: "llm_request_failed",
      userMessage: GENERIC_FAILURE,
      retryable: true,
    });
    return NextResponse.json(
      { error: clientError },
      { status: clientError.userMessage === GENERIC_FAILURE ? 502 : 409 },
    );
  }
}
