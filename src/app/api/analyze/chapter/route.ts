import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import { isUserFixableLLMConfigMessage } from "@/lib/llm-config";
import {
  CHAPTER_BRIEF_SYSTEM_PROMPT,
  buildChapterBriefUserPrompt,
} from "@/lib/prompts/chapter-brief";
import { createClient } from "@/lib/supabase/server";
import { ChapterBriefResultSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  bookId: z.string().uuid(),
  chapterId: z.string().uuid(),
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

  const [{ data: chapter }, { data: book }] = await Promise.all([
    supabase
      .from("chapters")
      .select("id, title, start_char, end_char, book_id")
      .eq("id", body.chapterId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("books")
      .select("id, cleaned_content")
      .eq("id", body.bookId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!chapter || chapter.book_id !== body.bookId) {
    return NextResponse.json({ error: "未找到章节。" }, { status: 404 });
  }
  if (!book?.cleaned_content) {
    return NextResponse.json({ error: "当前书籍内容不可用。" }, { status: 404 });
  }

  const chapterText = book.cleaned_content.slice(chapter.start_char, chapter.end_char);

  try {
    const llm = await getUserLLMClient(supabase);
    const result = await generateObject({
      model: llm.openai(llm.model),
      schema: ChapterBriefResultSchema,
      system: CHAPTER_BRIEF_SYSTEM_PROMPT,
      prompt: buildChapterBriefUserPrompt({
        chapterTitle: chapter.title,
        chapterText,
      }),
      temperature: llm.temperature,
      maxTokens: Math.min(2048, llm.maxTokens),
    });

    const { error: upErr } = await supabase.from("analyses").upsert(
      {
        book_id: body.bookId,
        user_id: user.id,
        scope: "chapter",
        chapter_id: body.chapterId,
        dimension: "chapter_brief",
        result: result.object,
        llm_config_id: llm.configId,
        prompt_tokens: Number.isFinite(result.usage.promptTokens)
          ? result.usage.promptTokens
          : null,
        completion_tokens: Number.isFinite(result.usage.completionTokens)
          ? result.usage.completionTokens
          : null,
      },
      { onConflict: "book_id,chapter_id,dimension" },
    );
    if (upErr) {
      return NextResponse.json({ error: "保存分析失败。" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result: result.object });
  } catch (e) {
    const msg =
      e instanceof Error && isUserFixableLLMConfigMessage(e.message) ? e.message : "章节分析失败。";
    return NextResponse.json({ error: msg }, { status: msg === "章节分析失败。" ? 502 : 409 });
  }
}
