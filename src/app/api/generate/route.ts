import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import { isUserFixableLLMConfigMessage } from "@/lib/llm-config";
import {
  buildGenerateUserPrompt,
  GENERATE_SYSTEM_PROMPT,
  GENERATE_TEXT_CHAR_LIMIT,
  GENERATE_TITLE_FALLBACK,
  scopeToMaxTokens,
} from "@/lib/prompts/generate";
import {
  getSessionStatusAfterGenerateFailure,
  getSessionStatusAfterGenerateSuccess,
  shouldEnterGeneratingStatus,
} from "@/lib/session-status";
import { createClient } from "@/lib/supabase/server";
import { countWords } from "@/lib/text/clean";
import {
  ANALYSIS_DIMENSIONS,
  CharactersResultSchema,
  GenerateConfigSchema,
  NarrativeResultSchema,
  VariantResultSchema,
  WorldviewResultSchema,
  type AnalysisDimension,
  type GenerateAnalyses,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  config: GenerateConfigSchema,
});

class RouteError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "RouteError";
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseAnalyses(
  rows: Array<{ dimension: AnalysisDimension; result: unknown }>
): GenerateAnalyses | null {
  const byDimension = new Map(rows.map((row) => [row.dimension, row.result]));

  const worldview = WorldviewResultSchema.safeParse(byDimension.get("worldview"));
  const characters = CharactersResultSchema.safeParse(byDimension.get("characters"));
  const narrative = NarrativeResultSchema.safeParse(byDimension.get("narrative"));

  if (!worldview.success || !characters.success || !narrative.success) {
    return null;
  }

  return {
    worldview: worldview.data,
    characters: characters.data,
    narrative: narrative.data,
  };
}

async function getLLMOrThrow(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    return await getUserLLMClient(supabase);
  } catch (error) {
    if (error instanceof Error && isUserFixableLLMConfigMessage(error.message)) {
      throw new RouteError(error.message, 409);
    }

    throw new RouteError("读取模型配置失败，请稍后再试。", 500);
  }
}

function sanitizeModelError() {
  return new RouteError("生成失败，请稍后重试。", 502);
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
    return jsonError("双书任务请使用蓝图生成入口。", 409);
  }

  if (session.status !== "analyzed" && session.status !== "done") {
    return jsonError("请先完成三维度分析。", 409);
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

  if (!book?.cleaned_content?.trim()) {
    return jsonError("当前书籍内容不可用。", 400);
  }

  const [{ data: analyses, error: analysesError }, { count: variantCount, error: variantCountError }] =
    await Promise.all([
      supabase
        .from("analyses")
        .select("dimension, result")
        .eq("user_id", user.id)
        .eq("book_id", book.id),
      supabase
        .from("variants")
        .select("*", { count: "exact", head: true })
        .eq("session_id", session.id)
        .eq("user_id", user.id),
    ]);

  if (analysesError) {
    return jsonError("读取分析结果失败，请稍后再试。", 500);
  }

  if (variantCountError) {
    return jsonError("读取变体列表失败，请稍后再试。", 500);
  }

  if ((analyses?.length ?? 0) !== ANALYSIS_DIMENSIONS.length) {
    return jsonError("请先完成三维度分析。", 409);
  }

  const parsedAnalyses = parseAnalyses(
    (analyses ?? []) as Array<{ dimension: AnalysisDimension; result: unknown }>
  );

  if (!parsedAnalyses) {
    return jsonError("请先完成三维度分析。", 409);
  }

  const excerpt = book.cleaned_content.slice(0, GENERATE_TEXT_CHAR_LIMIT);
  const existingVariantCount = variantCount ?? 0;
  let statusFlipped = false;
  let variantCreated = false;

  try {
    const llm = await getLLMOrThrow(supabase);

    if (shouldEnterGeneratingStatus(session.status)) {
      const { error: statusError } = await supabase
        .from("sessions")
        .update({ status: "generating" })
        .eq("id", session.id)
        .eq("user_id", user.id)
        .eq("status", "analyzed");

      if (statusError) {
        throw new RouteError("更新会话状态失败，请稍后再试。", 500);
      }

      statusFlipped = true;
    }

    const { object } = await generateObject({
      model: llm.openai(llm.model),
      schema: VariantResultSchema,
      system: GENERATE_SYSTEM_PROMPT,
      prompt: buildGenerateUserPrompt({
        analyses: parsedAnalyses,
        config: parsedBody.config,
        excerpt,
      }),
      temperature: llm.temperature,
      maxTokens: Math.min(scopeToMaxTokens(parsedBody.config.output_scope), llm.maxTokens),
    }).catch(() => {
      throw sanitizeModelError();
    });

    const title = object.title.trim() || GENERATE_TITLE_FALLBACK;
    const content = object.content.trim();

    if (!content) {
      throw sanitizeModelError();
    }

    const wordCount = countWords(content);
    const { data: insertedVariant, error: insertError } = await supabase
      .from("variants")
      .insert({
        session_id: session.id,
        user_id: user.id,
        title,
        config: parsedBody.config,
        content,
        word_count: wordCount,
        llm_config_id: llm.configId,
      })
      .select("id")
      .single();

    if (insertError || !insertedVariant) {
      throw new RouteError("保存变体失败，请稍后再试。", 500);
    }

    variantCreated = true;

    if (shouldEnterGeneratingStatus(session.status)) {
      const { error: doneError } = await supabase
        .from("sessions")
        .update({ status: getSessionStatusAfterGenerateSuccess() })
        .eq("id", session.id)
        .eq("user_id", user.id);

      if (doneError) {
        throw new RouteError("更新会话状态失败，请稍后再试。", 500);
      }
    }

    return NextResponse.json({
      ok: true,
      variantId: insertedVariant.id,
      title,
      wordCount,
    });
  } catch (error) {
    if (statusFlipped) {
      const restoreStatus = getSessionStatusAfterGenerateFailure(
        existingVariantCount + (variantCreated ? 1 : 0)
      );

      await supabase
        .from("sessions")
        .update({ status: restoreStatus })
        .eq("id", session.id)
        .eq("user_id", user.id);
    }

    if (error instanceof RouteError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("生成失败，请稍后重试。", 502);
  }
}
