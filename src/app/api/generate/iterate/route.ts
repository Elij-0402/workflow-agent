import { NextResponse } from "next/server";
import { z } from "zod";

import {
  validateOutlineVariantForBrief,
  validatePreviousChapterVariantForBrief,
} from "@/lib/brief-workflow";
import { asLLMClientError } from "@/lib/llm/errors";
import { streamLLMObject } from "@/lib/llm/runtime";
import { assertWithinRateLimit } from "@/lib/rate-limit";
import { composeBriefIntoPrompt } from "@/lib/prompts/brief-compose";
import {
  ITERATE_CHAPTER_RESULT_SCHEMA,
  ITERATE_CHAPTER_PROMPT_VERSION,
  ITERATE_CHAPTER_SCHEMA_VERSION,
  ITERATE_CHAPTER_SYSTEM_PROMPT,
  buildIterateChapterUserPrompt,
} from "@/lib/prompts/iterate-chapter";
import { OutlineSchema } from "@/lib/prompts/preview-outline";
import { sseResponse } from "@/lib/streaming/sse";
import { loadActiveSession } from "@/lib/sessions/guard";
import { createClient } from "@/lib/supabase/server";
import { countWords } from "@/lib/text/clean";
import { CreativeBriefSchema } from "@/lib/types/creative-brief";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  briefId: z.string().uuid(),
  outlineVariantId: z.string().uuid(),
  chapterIndex: z.number().int().min(1).max(200),
  previousVariantId: z.string().uuid().optional(),
  feedback: z.string().max(800).optional(),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "请先登录。" }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  const [{ data: brief }, { data: outlineVariant }, prev] = await Promise.all([
    supabase
      .from("creative_briefs")
      .select(
        "id, session_id, persona_directives, plot_directives, style_directives, retention_rules, title",
      )
      .eq("id", body.briefId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("variants")
      .select("id, session_id, content, scope, brief_id")
      .eq("id", body.outlineVariantId)
      .eq("user_id", user.id)
      .maybeSingle(),
    body.previousVariantId
      ? supabase
          .from("variants")
          .select("id, session_id, content, chapter_index, scope, brief_id")
          .eq("id", body.previousVariantId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!brief)
    return NextResponse.json({ error: "未找到简报。" }, { status: 404 });

  const { session, guard } = await loadActiveSession(
    supabase,
    brief.session_id,
    user.id,
  );
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.message },
      { status: guard.status },
    );
  }
  if (session?.status === "done") {
    return NextResponse.json(
      { error: "项目已完成，无法继续迭代。" },
      { status: 409 },
    );
  }

  const rateLimit = await assertWithinRateLimit(supabase, user.id);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: rateLimit.message },
      { status: rateLimit.status },
    );
  }

  const outlineCheck = validateOutlineVariantForBrief({
    brief,
    outlineVariant,
  });
  if (!outlineCheck.ok) {
    return NextResponse.json(
      { error: outlineCheck.message },
      { status: outlineCheck.status },
    );
  }
  if (body.previousVariantId) {
    const previousCheck = validatePreviousChapterVariantForBrief({
      brief,
      chapterIndex: body.chapterIndex,
      previousVariant: prev.data,
    });
    if (!previousCheck.ok) {
      return NextResponse.json(
        { error: previousCheck.message },
        { status: previousCheck.status },
      );
    }
  }
  const safeOutlineVariant = outlineVariant!;

  let outline;
  try {
    outline = OutlineSchema.parse(JSON.parse(safeOutlineVariant.content));
  } catch {
    return NextResponse.json({ error: "大纲格式异常。" }, { status: 409 });
  }

  if (!outline.chapters.some((c) => c.index === body.chapterIndex)) {
    return NextResponse.json(
      { error: `章节 ${body.chapterIndex} 不在大纲范围内。` },
      { status: 400 },
    );
  }

  const briefParsed = CreativeBriefSchema.safeParse({
    title: brief.title,
    persona_directives: brief.persona_directives,
    plot_directives: brief.plot_directives,
    style_directives: brief.style_directives,
    retention_rules: brief.retention_rules,
  });
  if (!briefParsed.success) {
    return NextResponse.json({ error: "简报格式异常。" }, { status: 409 });
  }

  const previousContent = prev.data?.content;

  const briefSection = composeBriefIntoPrompt(briefParsed.data);
  const userPrompt = buildIterateChapterUserPrompt({
    outline,
    chapterIndex: body.chapterIndex,
    previousContent,
    feedback: body.feedback,
    briefSection,
  });

  return sseResponse(async (emit) => {
    let result: Awaited<
      ReturnType<typeof streamLLMObject<typeof ITERATE_CHAPTER_RESULT_SCHEMA>>
    >;
    try {
      result = await streamLLMObject({
        supabase,
        route: "/api/generate/iterate",
        operation: "iterate_chapter",
        schema: ITERATE_CHAPTER_RESULT_SCHEMA,
        system: ITERATE_CHAPTER_SYSTEM_PROMPT,
        prompt: userPrompt,
        promptVersion: ITERATE_CHAPTER_PROMPT_VERSION,
        schemaVersion: ITERATE_CHAPTER_SCHEMA_VERSION,
        maxTokens: 6000,
        cacheSeed: {
          briefId: brief.id,
          outlineVariantId: body.outlineVariantId,
          chapterIndex: body.chapterIndex,
          previousVariantId: body.previousVariantId ?? null,
          feedback: body.feedback ?? "",
        },
      });
    } catch (error) {
      emit({
        type: "error",
        message: asLLMClientError(error, {
          code: "llm_request_failed",
          userMessage: "生成失败，请稍后重试。",
          retryable: true,
        }).userMessage,
      });
      return;
    }

    for await (const partial of result.partialObjectStream) {
      emit({ type: "partial", data: partial });
    }

    let finalized: Awaited<ReturnType<typeof result.finalize>>;
    try {
      finalized = await result.finalize();
    } catch (error) {
      emit({
        type: "error",
        message: asLLMClientError(error, {
          code: "llm_request_failed",
          userMessage: "生成失败，请稍后重试。",
          retryable: true,
        }).userMessage,
      });
      return;
    }

    const validated = ITERATE_CHAPTER_RESULT_SCHEMA.safeParse(finalized.object);
    if (!validated.success) {
      emit({ type: "error", message: "章节格式校验失败。" });
      return;
    }

    const content = validated.data.content.trim();
    if (!content) {
      emit({ type: "error", message: "生成内容为空。" });
      return;
    }

    const wordCount = countWords(content);
    const { data: variant, error } = await supabase
      .from("variants")
      .insert({
        session_id: brief.session_id,
        user_id: user.id,
        title: validated.data.title || `第 ${body.chapterIndex} 章`,
        config: {
          strategy: "balanced",
          innovation: 5,
          viewpoint: "keep",
          style: "keep",
          output_scope: "single-chapter",
          extra_instructions: body.feedback ?? "",
        },
        content,
        word_count: wordCount,
        llm_config_id: finalized.llm.configId,
        brief_id: brief.id,
        parent_variant_id: body.previousVariantId ?? null,
        scope: "chapter",
        chapter_index: body.chapterIndex,
        prompt_version: ITERATE_CHAPTER_PROMPT_VERSION,
        schema_version: ITERATE_CHAPTER_SCHEMA_VERSION,
        prompt_tokens: finalized.usage.promptTokens,
        completion_tokens: finalized.usage.completionTokens,
        estimated_cost_cny: finalized.estimatedCostCNY,
        cache_key: finalized.cacheKey,
      })
      .select("id")
      .single();
    if (error || !variant) {
      emit({ type: "error", message: "保存章节失败。" });
      return;
    }

    emit({
      type: "done",
      data: {
        variantId: variant.id,
        chapterIndex: body.chapterIndex,
        wordCount,
        title: validated.data.title,
      },
    });
  });
}
