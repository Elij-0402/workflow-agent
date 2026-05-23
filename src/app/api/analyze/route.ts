import { NextResponse } from "next/server";
import { z } from "zod";

import { saveAnalysis } from "@/lib/analysis-store";
import { asLLMClientError } from "@/lib/llm/errors";
import { runLLMObject } from "@/lib/llm/runtime";
import { ANALYSIS_TEXT_CHAR_LIMIT, ANALYSIS_DIMENSION_CONFIG } from "@/lib/prompts";
import { wrapUntrustedNovel } from "@/lib/prompts/safety";
import { createClient } from "@/lib/supabase/server";
import { getSessionStatusAfterAnalysis, shouldEnterAnalyzingStatus } from "@/lib/session-status";
import { LEGACY_ANALYSIS_DIMENSIONS, type LegacyAnalysisDimension } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  dimension: z.enum(
    LEGACY_ANALYSIS_DIMENSIONS as readonly [LegacyAnalysisDimension, ...LegacyAnalysisDimension[]],
  ),
});

const ANALYSIS_LOCKED_MESSAGE = "当前正在生成，暂不可重新分析。";
const ANALYSIS_GENERIC_FAILURE = "分析失败，请稍后重试。";

class RouteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RouteError";
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("请先登录。", 401);
  }

  let parsedBody: z.infer<typeof requestSchema>;
  try {
    parsedBody = requestSchema.parse(await request.json());
  } catch {
    return jsonError("请求参数不正确。", 400);
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, status, mode")
    .eq("id", parsedBody.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    return jsonError("读取会话失败，请稍后再试。", 500);
  }

  if (!session) {
    return jsonError("未找到对应会话。", 404);
  }

  if (session.mode === "dual") {
    return jsonError("双书任务请使用工作台的章节分析入口。", 409);
  }

  if (session.status === "generating") {
    return jsonError(ANALYSIS_LOCKED_MESSAGE, 409);
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, cleaned_content")
    .eq("session_id", session.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (bookError) {
    return jsonError("读取书籍内容失败，请稍后再试。", 500);
  }

  if (!book?.cleaned_content) {
    return jsonError("当前书籍内容不可用。", 400);
  }

  const promptConfig = ANALYSIS_DIMENSION_CONFIG[parsedBody.dimension];
  const excerpt = book.cleaned_content.slice(0, ANALYSIS_TEXT_CHAR_LIMIT);
  let currentStatus = session.status;
  let statusFlipped = false;
  let analysisSaved = false;

  try {
    if (shouldEnterAnalyzingStatus(currentStatus)) {
      const { error: statusError } = await supabase
        .from("sessions")
        .update({ status: "analyzing" })
        .eq("id", session.id)
        .eq("user_id", user.id)
        .eq("status", "uploaded");

      if (statusError) {
        throw new RouteError("更新会话状态失败，请稍后再试。", 500);
      }

      currentStatus = "analyzing";
      statusFlipped = true;
    }

    const result = await runLLMObject({
      supabase,
      route: "/api/analyze",
      operation: `analysis:${parsedBody.dimension}`,
      schema: promptConfig.schema,
      system: promptConfig.systemPrompt,
      prompt: wrapUntrustedNovel(excerpt),
      promptVersion: promptConfig.promptVersion,
      schemaVersion: promptConfig.schemaVersion,
      cacheSeed: {
        bookId: book.id,
        dimension: parsedBody.dimension,
        excerpt,
      },
    });

    const { error: upsertError } = await saveAnalysis({
      supabase,
      userId: user.id,
      bookId: book.id,
      scope: "book",
      dimension: parsedBody.dimension,
      result: result.object,
      llmConfigId: result.llm.configId,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      promptVersion: promptConfig.promptVersion,
      schemaVersion: promptConfig.schemaVersion,
      estimatedCostCNY: result.estimatedCostCNY,
      cacheKey: result.cacheKey,
    });

    if (upsertError) {
      throw new RouteError("保存分析结果失败，请稍后再试。", 500);
    }

    analysisSaved = true;

    const [
      { count: analysisCount, error: analysisCountError },
      { count: variantCount, error: variantCountError },
    ] = await Promise.all([
      supabase
        .from("analyses")
        .select("*", { count: "exact", head: true })
        .eq("book_id", book.id)
        .eq("user_id", user.id),
      supabase
        .from("variants")
        .select("*", { count: "exact", head: true })
        .eq("session_id", session.id)
        .eq("user_id", user.id),
    ]);

    if (analysisCountError || variantCountError) {
      throw new RouteError("更新会话状态失败，请稍后再试。", 500);
    }

    const nextStatus = getSessionStatusAfterAnalysis({
      analysisCount: analysisCount ?? 0,
      totalAnalyses: LEGACY_ANALYSIS_DIMENSIONS.length,
      variantCount: variantCount ?? 0,
    });

    if (nextStatus !== currentStatus) {
      const { error: statusError } = await supabase
        .from("sessions")
        .update({ status: nextStatus })
        .eq("id", session.id)
        .eq("user_id", user.id);

      if (statusError) {
        throw new RouteError("更新会话状态失败，请稍后再试。", 500);
      }
    }

    return NextResponse.json({
      ok: true,
      dimension: parsedBody.dimension,
      result: result.object,
    });
  } catch (error) {
    // Restore session.status if we flipped it but never saved an analysis row.
    // Mirrors the rollback pattern in src/app/api/generate/route.ts.
    if (statusFlipped && !analysisSaved) {
      await supabase
        .from("sessions")
        .update({ status: "uploaded" })
        .eq("id", session.id)
        .eq("user_id", user.id);
    }

    if (error instanceof RouteError) {
      return jsonError(error.message, error.status);
    }

    const clientError = asLLMClientError(error, {
      code: "llm_request_failed",
      userMessage: ANALYSIS_GENERIC_FAILURE,
      retryable: true,
    });
    return NextResponse.json(
      { error: clientError },
      { status: clientError.userMessage === ANALYSIS_GENERIC_FAILURE ? 500 : 409 },
    );
  }
}
