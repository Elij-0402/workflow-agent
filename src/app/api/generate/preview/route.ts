import { NextResponse } from "next/server";
import { z } from "zod";

import { validateConfirmedBlueprintForBrief } from "@/lib/brief-workflow";
import { asLLMClientError } from "@/lib/llm/errors";
import { streamLLMObject } from "@/lib/llm/runtime";
import { assertWithinRateLimit } from "@/lib/rate-limit";
import {
  OutlineSchema,
  PREVIEW_OUTLINE_PROMPT_VERSION,
  PREVIEW_OUTLINE_SCHEMA_VERSION,
  PREVIEW_OUTLINE_SYSTEM_PROMPT,
  buildPreviewOutlineUserPrompt,
} from "@/lib/prompts/preview-outline";
import { composeBriefIntoPrompt } from "@/lib/prompts/brief-compose";
import { sseResponse } from "@/lib/streaming/sse";
import { loadActiveSession } from "@/lib/sessions/guard";
import { createClient } from "@/lib/supabase/server";
import { CreativeBriefSchema } from "@/lib/types/creative-brief";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  briefId: z.string().uuid(),
  targetChapterCount: z.number().int().min(3).max(50).optional(),
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

  const { data: briefRow } = await supabase
    .from("creative_briefs")
    .select(
      "id, session_id, title, persona_directives, plot_directives, style_directives, retention_rules",
    )
    .eq("id", body.briefId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!briefRow) {
    return NextResponse.json({ error: "未找到简报。" }, { status: 404 });
  }

  const { guard } = await loadActiveSession(
    supabase,
    briefRow.session_id,
    user.id,
  );
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.message },
      { status: guard.status },
    );
  }

  const rateLimit = await assertWithinRateLimit(supabase, user.id);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: rateLimit.message },
      { status: rateLimit.status },
    );
  }

  const briefParsed = CreativeBriefSchema.safeParse({
    title: briefRow.title,
    persona_directives: briefRow.persona_directives,
    plot_directives: briefRow.plot_directives,
    style_directives: briefRow.style_directives,
    retention_rules: briefRow.retention_rules,
  });
  if (!briefParsed.success) {
    return NextResponse.json(
      { error: "简报格式异常，请编辑后重试。" },
      { status: 409 },
    );
  }

  const { data: bp } = await supabase
    .from("blueprints")
    .select("id, session_id, status, sections")
    .eq("session_id", briefRow.session_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const blueprintCheck = validateConfirmedBlueprintForBrief({
    brief: briefRow,
    blueprint: bp,
  });
  if (!blueprintCheck.ok) {
    return NextResponse.json(
      { error: blueprintCheck.message },
      { status: blueprintCheck.status },
    );
  }
  const confirmedBlueprint = bp!;

  const briefSection = composeBriefIntoPrompt(briefParsed.data);
  const userPrompt = buildPreviewOutlineUserPrompt({
    blueprint: confirmedBlueprint.sections,
    briefSection,
    targetChapterCount: body.targetChapterCount,
  });

  return sseResponse(async (emit) => {
    let result: Awaited<
      ReturnType<typeof streamLLMObject<typeof OutlineSchema>>
    >;
    try {
      result = await streamLLMObject({
        supabase,
        route: "/api/generate/preview",
        operation: "preview_outline",
        schema: OutlineSchema,
        system: PREVIEW_OUTLINE_SYSTEM_PROMPT,
        prompt: userPrompt,
        promptVersion: PREVIEW_OUTLINE_PROMPT_VERSION,
        schemaVersion: PREVIEW_OUTLINE_SCHEMA_VERSION,
        maxTokens: 4096,
        cacheSeed: {
          briefId: briefRow.id,
          sessionId: briefRow.session_id,
          targetChapterCount: body.targetChapterCount ?? null,
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

    const validated = OutlineSchema.safeParse(finalized.object);
    if (!validated.success) {
      emit({ type: "error", message: "大纲格式校验失败，请重试。" });
      return;
    }

    const { data: variant, error } = await supabase
      .from("variants")
      .insert({
        session_id: briefRow.session_id,
        user_id: user.id,
        title: validated.data.title,
        config: {
          strategy: "balanced",
          innovation: 5,
          viewpoint: "keep",
          style: "keep",
          output_scope: "outline",
          extra_instructions: "",
        },
        content: JSON.stringify(validated.data, null, 2),
        word_count: null,
        llm_config_id: finalized.llm.configId,
        brief_id: briefRow.id,
        scope: "outline",
        prompt_version: PREVIEW_OUTLINE_PROMPT_VERSION,
        schema_version: PREVIEW_OUTLINE_SCHEMA_VERSION,
        prompt_tokens: finalized.usage.promptTokens,
        completion_tokens: finalized.usage.completionTokens,
        estimated_cost_cny: finalized.estimatedCostCNY,
        cache_key: finalized.cacheKey,
      })
      .select("id")
      .single();
    if (error || !variant) {
      emit({ type: "error", message: "保存大纲失败。" });
      return;
    }

    emit({
      type: "done",
      data: {
        outline: validated.data,
        variantId: variant.id,
        usage: {
          prompt_tokens: Number.isFinite(finalized.usage.promptTokens)
            ? finalized.usage.promptTokens
            : null,
          completion_tokens: Number.isFinite(finalized.usage.completionTokens)
            ? finalized.usage.completionTokens
            : null,
        },
      },
    });
  });
}
