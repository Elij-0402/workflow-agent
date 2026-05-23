import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserLLMClient } from "@/lib/llm/dispatch";
import {
  BOOK_SYNTHESIS_SYSTEM_PROMPT,
  buildBookSynthesisUserPrompt,
  pickBriefsForSynthesis,
  type BriefEntry,
} from "@/lib/prompts/book-synthesis";
import { saveAnalysis } from "@/lib/analysis-store";
import { createClient } from "@/lib/supabase/server";
import { BookSynthesisResultSchema, ChapterBriefResultSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

const bodySchema = z.object({ bookId: z.string().uuid() });

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

  const [{ data: book }, { data: chapters }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title")
      .eq("id", body.bookId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("chapters")
      .select("id, index")
      .eq("book_id", body.bookId)
      .eq("user_id", user.id)
      .order("index", { ascending: true }),
  ]);

  if (!book) return NextResponse.json({ error: "未找到书籍。" }, { status: 404 });
  if (!chapters?.length) {
    return NextResponse.json({ error: "当前书籍没有章节。" }, { status: 400 });
  }

  const { data: briefs } = await supabase
    .from("analyses")
    .select("chapter_id, result")
    .eq("book_id", body.bookId)
    .eq("user_id", user.id)
    .eq("scope", "chapter")
    .eq("dimension", "chapter_brief");

  const briefByChapter = new Map((briefs ?? []).map((b) => [b.chapter_id as string, b.result]));
  const missing = chapters.filter((c) => !briefByChapter.has(c.id));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `还有 ${missing.length} 个章节未完成 chapter_brief。` },
      { status: 409 },
    );
  }

  const entries: BriefEntry[] = chapters.map((c) => {
    const parsed = ChapterBriefResultSchema.safeParse(briefByChapter.get(c.id));
    return {
      index: c.index,
      brief: parsed.success ? parsed.data : { events: [] },
    };
  });
  const sampled = pickBriefsForSynthesis(entries);

  try {
    const llm = await getUserLLMClient(supabase);
    const result = await generateObject({
      model: llm.openai(llm.model),
      schema: BookSynthesisResultSchema,
      system: BOOK_SYNTHESIS_SYSTEM_PROMPT,
      prompt: buildBookSynthesisUserPrompt({
        bookTitle: book.title,
        briefs: sampled,
      }),
      temperature: llm.temperature,
      maxTokens: Math.min(4096, llm.maxTokens),
    });

    const { error: upErr } = await saveAnalysis({
      supabase,
      userId: user.id,
      bookId: body.bookId,
      scope: "book",
      dimension: "book_synthesis",
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
      return NextResponse.json({ error: "保存整书汇总失败。" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, result: result.object });
  } catch {
    return NextResponse.json({ error: "整书汇总失败。" }, { status: 502 });
  }
}
