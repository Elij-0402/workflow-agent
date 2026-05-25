import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getBookAnalysisBlockingReason,
  getBookProviderCompatibility,
  resolveBookAnalysisView,
} from "@/lib/books/content";
import { saveAnalysis } from "@/lib/analysis-store";
import { asLLMClientError } from "@/lib/llm/errors";
import { getUserLLMClient } from "@/lib/llm/dispatch";
import { runLLMObject } from "@/lib/llm/runtime";
import { assertWithinRateLimit } from "@/lib/rate-limit";
import {
  ANALYSIS_TEXT_CHAR_LIMIT,
  EXTENDED_ANALYSIS_DIMENSION_CONFIG,
} from "@/lib/prompts";
import { wrapUntrustedNovel } from "@/lib/prompts/safety";
import { loadActiveSessionByBookId } from "@/lib/sessions/guard";
import { createClient } from "@/lib/supabase/server";
import {
  EXTENDED_ANALYSIS_DIMENSIONS,
  type ExtendedAnalysisDimension,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  bookId: z.string().uuid(),
  dimension: z.enum(
    EXTENDED_ANALYSIS_DIMENSIONS as readonly [
      ExtendedAnalysisDimension,
      ...ExtendedAnalysisDimension[],
    ],
  ),
});

const GENERIC_FAILURE = "扩展分析失败，请稍后重试。";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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

  const { guard } = await loadActiveSessionByBookId(
    supabase,
    body.bookId,
    user.id,
  );
  if (!guard.ok) {
    return jsonError(guard.message, guard.status);
  }

  const rateLimit = await assertWithinRateLimit(supabase, user.id);
  if (!rateLimit.ok) {
    return jsonError(rateLimit.message, rateLimit.status);
  }

  const { data: book } = await supabase
    .from("books")
    .select("id, cleaned_content, metadata, storage_path")
    .eq("id", body.bookId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!book) return jsonError("未找到书籍。", 404);
  const blockingReason = getBookAnalysisBlockingReason(book.metadata);
  if (blockingReason) return jsonError(blockingReason, 409);
  const analysisView = await resolveBookAnalysisView(supabase, book);
  if (!analysisView) return jsonError("当前书籍内容不可用。", 400);

  const promptConfig = EXTENDED_ANALYSIS_DIMENSION_CONFIG[body.dimension];
  const excerpt = analysisView.slice(0, ANALYSIS_TEXT_CHAR_LIMIT);

  try {
    const llm = await getUserLLMClient(supabase);
    const compatibility = getBookProviderCompatibility(
      book.metadata,
      llm.provider,
    );
    if (compatibility.status === "incompatible") {
      return jsonError(
        compatibility.reason ?? "当前模型不兼容该内容类型，请切换模型后再试。",
        409,
      );
    }

    const result = await runLLMObject({
      supabase,
      route: "/api/analyze/extended",
      operation: `extended:${body.dimension}`,
      schema: promptConfig.schema,
      system: promptConfig.systemPrompt,
      prompt: wrapUntrustedNovel(excerpt),
      promptVersion: promptConfig.promptVersion,
      schemaVersion: promptConfig.schemaVersion,
      cacheSeed: {
        bookId: book.id,
        dimension: body.dimension,
        excerpt,
      },
    });

    const { error: upErr } = await saveAnalysis({
      supabase,
      userId: user.id,
      bookId: book.id,
      scope: "book",
      dimension: body.dimension,
      result: result.object,
      llmConfigId: result.llm.configId,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      promptVersion: promptConfig.promptVersion,
      schemaVersion: promptConfig.schemaVersion,
      estimatedCostCNY: result.estimatedCostCNY,
      cacheKey: result.cacheKey,
    });
    if (upErr) {
      return jsonError("保存分析结果失败。", 500);
    }

    return NextResponse.json({
      ok: true,
      dimension: body.dimension,
      result: result.object,
    });
  } catch (e) {
    const clientError = asLLMClientError(e, {
      code: "llm_request_failed",
      userMessage: GENERIC_FAILURE,
      retryable: true,
    });
    return jsonError(
      clientError.userMessage,
      clientError.userMessage === GENERIC_FAILURE ? 502 : 409,
    );
  }
}
