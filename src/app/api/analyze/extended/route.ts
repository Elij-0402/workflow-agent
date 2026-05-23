import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import { resolveStructuredObjectMode } from "@/lib/llm/structured-output";
import { isUserFixableLLMConfigMessage } from "@/lib/llm-config";
import { saveAnalysis } from "@/lib/analysis-store";
import { ANALYSIS_TEXT_CHAR_LIMIT, EXTENDED_ANALYSIS_DIMENSION_CONFIG } from "@/lib/prompts";
import { wrapUntrustedNovel } from "@/lib/prompts/safety";
import { createClient } from "@/lib/supabase/server";
import { EXTENDED_ANALYSIS_DIMENSIONS, type ExtendedAnalysisDimension } from "@/lib/types";

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

  const { data: book } = await supabase
    .from("books")
    .select("id, cleaned_content")
    .eq("id", body.bookId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!book) return jsonError("未找到书籍。", 404);
  if (!book.cleaned_content) return jsonError("当前书籍内容不可用。", 400);

  const promptConfig = EXTENDED_ANALYSIS_DIMENSION_CONFIG[body.dimension];
  const excerpt = book.cleaned_content.slice(0, ANALYSIS_TEXT_CHAR_LIMIT);

  try {
    const llm = await getUserLLMClient(supabase);
    const result = await generateObject({
      model: llm.openai(llm.model),
      mode: resolveStructuredObjectMode(llm.provider),
      schema: promptConfig.schema,
      system: promptConfig.systemPrompt,
      prompt: wrapUntrustedNovel(excerpt),
      temperature: llm.temperature,
      maxTokens: llm.maxTokens,
    });

    const { error: upErr } = await saveAnalysis({
      supabase,
      userId: user.id,
      bookId: book.id,
      scope: "book",
      dimension: body.dimension,
      result: result.object,
      llmConfigId: llm.configId,
      promptTokens: Number.isFinite(result.usage.promptTokens)
        ? result.usage.promptTokens
        : null,
      completionTokens: Number.isFinite(result.usage.completionTokens)
        ? result.usage.completionTokens
        : null,
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
    const msg =
      e instanceof Error && isUserFixableLLMConfigMessage(e.message) ? e.message : GENERIC_FAILURE;
    return jsonError(msg, msg === GENERIC_FAILURE ? 502 : 409);
  }
}
