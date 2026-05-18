import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import { ANALYSIS_TEXT_CHAR_LIMIT, ANALYSIS_DIMENSION_CONFIG } from "@/lib/prompts";
import { ANALYSIS_DIMENSIONS, type AnalysisDimension } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  dimension: z.enum(ANALYSIS_DIMENSIONS as [AnalysisDimension, ...AnalysisDimension[]]),
});

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
    .select("id, status")
    .eq("id", parsedBody.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    return jsonError("读取会话失败，请稍后再试。", 500);
  }

  if (!session) {
    return jsonError("未找到对应会话。", 404);
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

  if (session.status === "uploaded") {
    await supabase
      .from("sessions")
      .update({ status: "analyzing" })
      .eq("id", session.id)
      .eq("user_id", user.id)
      .eq("status", "uploaded");
  }

  const promptConfig = ANALYSIS_DIMENSION_CONFIG[parsedBody.dimension];
  const excerpt = book.cleaned_content.slice(0, ANALYSIS_TEXT_CHAR_LIMIT);

  try {
    const llm = await getUserLLMClient(supabase);
    const result = await generateObject({
      model: llm.openai(llm.model),
      schema: promptConfig.schema,
      system: promptConfig.systemPrompt,
      prompt: excerpt,
      temperature: llm.temperature,
      maxTokens: llm.maxTokens,
    });

    const { error: upsertError } = await supabase.from("analyses").upsert(
      {
        book_id: book.id,
        user_id: user.id,
        dimension: parsedBody.dimension,
        result: result.object,
        llm_config_id: llm.configId,
        prompt_tokens: Number.isFinite(result.usage.promptTokens)
          ? result.usage.promptTokens
          : null,
        completion_tokens: Number.isFinite(result.usage.completionTokens)
          ? result.usage.completionTokens
          : null,
      },
      {
        onConflict: "book_id,dimension",
      }
    );

    if (upsertError) {
      return jsonError("保存分析结果失败，请稍后再试。", 500);
    }

    const { count } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })
      .eq("book_id", book.id)
      .eq("user_id", user.id);

    if (count === ANALYSIS_DIMENSIONS.length) {
      await supabase
        .from("sessions")
        .update({ status: "analyzed" })
        .eq("id", session.id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      ok: true,
      dimension: parsedBody.dimension,
      result: result.object,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "请先在设置页保存模型配置。"
        ? error.message
        : "分析失败，请稍后重试。";
    return jsonError(message, 500);
  }
}
