import { streamObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import {
  OutlineSchema,
  PREVIEW_OUTLINE_SYSTEM_PROMPT,
  buildPreviewOutlineUserPrompt,
} from "@/lib/prompts/preview-outline";
import { composeBriefIntoPrompt } from "@/lib/prompts/brief-compose";
import { sseResponse } from "@/lib/streaming/sse";
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

  const briefParsed = CreativeBriefSchema.safeParse({
    title: briefRow.title,
    persona_directives: briefRow.persona_directives,
    plot_directives: briefRow.plot_directives,
    style_directives: briefRow.style_directives,
    retention_rules: briefRow.retention_rules,
  });
  if (!briefParsed.success) {
    return NextResponse.json({ error: "简报格式异常，请编辑后重试。" }, { status: 409 });
  }

  const { data: bp } = await supabase
    .from("blueprints")
    .select("id, status, sections")
    .eq("session_id", briefRow.session_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!bp) {
    return NextResponse.json({ error: "项目尚无蓝图，无法预生成大纲。" }, { status: 409 });
  }
  if (bp.status !== "confirmed") {
    return NextResponse.json({ error: "请先在工作台确认蓝图。" }, { status: 409 });
  }

  const briefSection = composeBriefIntoPrompt(briefParsed.data);
  const userPrompt = buildPreviewOutlineUserPrompt({
    blueprint: bp.sections,
    briefSection,
    targetChapterCount: body.targetChapterCount,
  });

  return sseResponse(async (emit) => {
    const llm = await getUserLLMClient(supabase);
    const result = streamObject({
      model: llm.openai(llm.model),
      schema: OutlineSchema,
      system: PREVIEW_OUTLINE_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: llm.temperature,
      maxTokens: Math.min(4096, llm.maxTokens),
    });

    for await (const partial of result.partialObjectStream) {
      emit({ type: "partial", data: partial });
    }

    let object: unknown;
    try {
      object = await result.object;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "stream failed";
      emit({ type: "error", message: `生成失败：${msg}` });
      return;
    }

    const validated = OutlineSchema.safeParse(object);
    if (!validated.success) {
      emit({ type: "error", message: "大纲格式校验失败，请重试。" });
      return;
    }

    const usage = await result.usage;
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
        llm_config_id: llm.configId,
        brief_id: briefRow.id,
        scope: "outline",
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
          prompt_tokens: Number.isFinite(usage.promptTokens) ? usage.promptTokens : null,
          completion_tokens: Number.isFinite(usage.completionTokens)
            ? usage.completionTokens
            : null,
        },
      },
    });
  });
}
