import { streamObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import { composeBriefIntoPrompt } from "@/lib/prompts/brief-compose";
import {
  ITERATE_CHAPTER_RESULT_SCHEMA,
  ITERATE_CHAPTER_SYSTEM_PROMPT,
  buildIterateChapterUserPrompt,
} from "@/lib/prompts/iterate-chapter";
import { OutlineSchema } from "@/lib/prompts/preview-outline";
import { sseResponse } from "@/lib/streaming/sse";
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
          .select("id, content, chapter_index, scope")
          .eq("id", body.previousVariantId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!brief) return NextResponse.json({ error: "未找到简报。" }, { status: 404 });
  if (!outlineVariant) {
    return NextResponse.json({ error: "未找到大纲。" }, { status: 404 });
  }
  if (outlineVariant.scope !== "outline") {
    return NextResponse.json({ error: "传入的不是大纲版本。" }, { status: 409 });
  }
  if (outlineVariant.session_id !== brief.session_id) {
    return NextResponse.json({ error: "大纲和简报不属于同一项目。" }, { status: 409 });
  }

  let outline;
  try {
    outline = OutlineSchema.parse(JSON.parse(outlineVariant.content));
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

  const previousContent =
    prev?.data && prev.data.scope === "chapter" && prev.data.chapter_index === body.chapterIndex
      ? prev.data.content
      : undefined;

  const briefSection = composeBriefIntoPrompt(briefParsed.data);
  const userPrompt = buildIterateChapterUserPrompt({
    outline,
    chapterIndex: body.chapterIndex,
    previousContent,
    feedback: body.feedback,
    briefSection,
  });

  return sseResponse(async (emit) => {
    const llm = await getUserLLMClient(supabase);
    const result = streamObject({
      model: llm.openai(llm.model),
      schema: ITERATE_CHAPTER_RESULT_SCHEMA,
      system: ITERATE_CHAPTER_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: llm.temperature,
      maxTokens: Math.min(6000, llm.maxTokens),
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

    const validated = ITERATE_CHAPTER_RESULT_SCHEMA.safeParse(object);
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
        llm_config_id: llm.configId,
        brief_id: brief.id,
        parent_variant_id: body.previousVariantId ?? null,
        scope: "chapter",
        chapter_index: body.chapterIndex,
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
