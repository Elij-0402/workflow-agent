import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import { isUserFixableLLMConfigMessage } from "@/lib/llm-config";
import {
  GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT,
  buildGenerateFromBlueprintUserPrompt,
} from "@/lib/prompts/generate-from-blueprint";
import {
  GENERATE_TITLE_FALLBACK,
  scopeToMaxTokens,
} from "@/lib/prompts/generate";
import { createClient } from "@/lib/supabase/server";
import { countWords } from "@/lib/text/clean";
import { GenerateConfigSchema, VariantResultSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  blueprintId: z.string().uuid(),
  config: GenerateConfigSchema,
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

  try {
    const llm = await getUserLLMClient(supabase);
    const { object } = await generateObject({
      model: llm.openai(llm.model),
      schema: VariantResultSchema,
      system: GENERATE_FROM_BLUEPRINT_SYSTEM_PROMPT,
      prompt: buildGenerateFromBlueprintUserPrompt({
        blueprint: bp.sections,
        config: body.config,
      }),
      temperature: llm.temperature,
      maxTokens: Math.min(scopeToMaxTokens(body.config.output_scope), llm.maxTokens),
    });
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
        llm_config_id: llm.configId,
        blueprint_id: bp.id,
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
    const msg =
      e instanceof Error && isUserFixableLLMConfigMessage(e.message)
        ? e.message
        : "生成失败，请稍后重试。";
    return NextResponse.json(
      { error: msg },
      { status: msg === "生成失败，请稍后重试。" ? 502 : 409 }
    );
  }
}
