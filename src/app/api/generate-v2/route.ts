import { NextResponse } from "next/server";
import { z } from "zod";

import { asLLMClientError } from "@/lib/llm/errors";
import { runLLMObject } from "@/lib/llm/runtime";
import { assertWithinRateLimit } from "@/lib/rate-limit";
import { BlueprintSchema, emptyBlueprint } from "@/lib/blueprint/schema";
import { composeBriefIntoPrompt } from "@/lib/prompts/brief-compose";
import { loadActiveSession } from "@/lib/sessions/guard";
import {
  GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT,
  GENERATE_FROM_BLUEPRINT_PROMPT_VERSION,
  GENERATE_FROM_BLUEPRINT_SCHEMA_VERSION,
  buildGenerateFromBlueprintUserPrompt,
} from "@/lib/prompts/generate-from-blueprint";
import {
  GENERATE_TITLE_FALLBACK,
  scopeToMaxTokens,
} from "@/lib/prompts/generate";
import { createClient } from "@/lib/supabase/server";
import { countWords } from "@/lib/text/clean";
import { GenerateConfigSchema, VariantResultSchema } from "@/lib/types";
import { CreativeBriefSchema } from "@/lib/types/creative-brief";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  blueprintId: z.string().uuid(),
  config: GenerateConfigSchema,
  briefId: z.string().uuid().optional(),
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

  const { data: bp } = await supabase
    .from("blueprints")
    .select("id, session_id, status, sections")
    .eq("id", body.blueprintId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bp) return NextResponse.json({ error: "未找到蓝图。" }, { status: 404 });
  if (bp.status !== "confirmed") {
    return NextResponse.json({ error: "请先确认蓝图。" }, { status: 409 });
  }

  const { guard } = await loadActiveSession(supabase, bp.session_id, user.id);
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

  let blueprint: ReturnType<typeof BlueprintSchema.parse>;
  try {
    blueprint = BlueprintSchema.parse(bp.sections ?? emptyBlueprint());
  } catch {
    return NextResponse.json(
      { error: "蓝图格式异常，请重新确认蓝图。" },
      { status: 409 },
    );
  }

  let briefSection = "";
  if (body.briefId) {
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
    if (briefRow.session_id !== bp.session_id) {
      return NextResponse.json(
        { error: "简报和蓝图不属于同一项目。" },
        { status: 409 },
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
      return NextResponse.json({ error: "简报格式异常。" }, { status: 409 });
    }
    briefSection = composeBriefIntoPrompt(briefParsed.data);
  }

  try {
    const userPrompt = buildGenerateFromBlueprintUserPrompt({
      blueprint,
      config: body.config,
    });
    const finalPrompt = briefSection
      ? `${userPrompt}\n\n${briefSection}`
      : userPrompt;
    const result = await runLLMObject({
      supabase,
      route: "/api/generate-v2",
      operation: "generate_from_blueprint",
      schema: VariantResultSchema,
      system: GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT,
      prompt: finalPrompt,
      promptVersion: GENERATE_FROM_BLUEPRINT_PROMPT_VERSION,
      schemaVersion: GENERATE_FROM_BLUEPRINT_SCHEMA_VERSION,
      maxTokens: scopeToMaxTokens(body.config.output_scope),
      cacheSeed: {
        blueprintId: bp.id,
        briefId: body.briefId ?? null,
        config: body.config,
      },
    });
    const { object } = result;
    const title = object.title.trim() || GENERATE_TITLE_FALLBACK;
    const content = object.content.trim();
    if (!content) {
      return NextResponse.json({ error: "生成内容为空。" }, { status: 502 });
    }
    const wordCount = countWords(content);

    const { data: variant, error } = await supabase
      .from("variants")
      .insert({
        session_id: bp.session_id,
        user_id: user.id,
        title,
        config: body.config,
        content,
        word_count: wordCount,
        llm_config_id: result.llm.configId,
        blueprint_id: bp.id,
        brief_id: body.briefId ?? null,
        scope: "full",
        prompt_version: GENERATE_FROM_BLUEPRINT_PROMPT_VERSION,
        schema_version: GENERATE_FROM_BLUEPRINT_SCHEMA_VERSION,
        prompt_tokens: result.usage.promptTokens,
        completion_tokens: result.usage.completionTokens,
        estimated_cost_cny: result.estimatedCostCNY,
        cache_key: result.cacheKey,
      })
      .select("id")
      .single();
    if (error || !variant) {
      return NextResponse.json({ error: "保存变体失败。" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      variantId: variant.id,
      title,
      wordCount,
    });
  } catch (e) {
    const clientError = asLLMClientError(e, {
      code: "llm_request_failed",
      userMessage: "生成失败，请稍后重试。",
      retryable: true,
    });
    return NextResponse.json(
      { error: clientError },
      {
        status:
          clientError.userMessage === "生成失败，请稍后重试。" ? 502 : 409,
      },
    );
  }
}
