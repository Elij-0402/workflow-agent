import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { expandToChapters } from "@/lib/text/chapters";
import { loadActiveSessionByBookId } from "@/lib/sessions/guard";

export const runtime = "nodejs";
export const maxDuration = 60;

const manualChapterSchema = z.object({
  title: z.string().min(1),
  startChar: z.number().int().nonnegative(),
  endChar: z.number().int().positive(),
});

const bodySchema = z.object({
  bookId: z.string().uuid(),
  mode: z.enum(["regex", "length", "manual"]),
  chunkChars: z.number().int().positive().max(50_000).optional(),
  chapters: z.array(manualChapterSchema).optional(),
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

  const { data: book } = await supabase
    .from("books")
    .select("id, cleaned_content")
    .eq("id", body.bookId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!book?.cleaned_content) {
    return NextResponse.json(
      { error: "当前书籍内容不可用。" },
      { status: 404 },
    );
  }

  const { guard } = await loadActiveSessionByBookId(
    supabase,
    body.bookId,
    user.id,
  );
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.message },
      { status: guard.status },
    );
  }

  type ChapterRow = {
    index: number;
    title: string;
    startChar: number;
    endChar: number;
    source: "regex" | "length-chunk" | "manual";
  };

  let chapters: ChapterRow[];
  if (body.mode === "regex") {
    chapters = expandToChapters(book.cleaned_content, {
      fallbackChunkChars: body.chunkChars ?? 5000,
    });
  } else if (body.mode === "length") {
    const size = body.chunkChars ?? 5000;
    const text = book.cleaned_content;
    chapters = [];
    for (let i = 0, cursor = 0; cursor < text.length; i += 1) {
      const end = Math.min(cursor + size, text.length);
      chapters.push({
        index: i + 1,
        title: `块 #${i + 1}`,
        startChar: cursor,
        endChar: end,
        source: "length-chunk",
      });
      cursor = end;
    }
    if (chapters.length === 0) {
      chapters.push({
        index: 1,
        title: "块 #1",
        startChar: 0,
        endChar: text.length,
        source: "length-chunk",
      });
    }
  } else {
    if (!body.chapters?.length) {
      return NextResponse.json(
        { error: "手工模式需要 chapters 数组。" },
        { status: 400 },
      );
    }
    chapters = body.chapters.map((c, i) => ({
      index: i + 1,
      title: c.title,
      startChar: c.startChar,
      endChar: c.endChar,
      source: "manual" as const,
    }));
  }

  const { error: deleteErr } = await supabase
    .from("chapters")
    .delete()
    .eq("book_id", body.bookId)
    .eq("user_id", user.id);
  if (deleteErr) {
    return NextResponse.json({ error: "章节替换失败。" }, { status: 500 });
  }

  const { error: insertErr } = await supabase.from("chapters").insert(
    chapters.map((c) => ({
      book_id: body.bookId,
      user_id: user.id,
      index: c.index,
      title: c.title,
      start_char: c.startChar,
      end_char: c.endChar,
      source: c.source,
    })),
  );
  if (insertErr) {
    return NextResponse.json({ error: "章节写入失败。" }, { status: 500 });
  }

  await supabase
    .from("books")
    .update({ chapter_count: chapters.length })
    .eq("id", body.bookId)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true, count: chapters.length });
}
