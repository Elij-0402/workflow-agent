import { notFound, redirect } from "next/navigation";

import { BlueprintSchema, emptyBlueprint } from "@/lib/blueprint/schema";
import { createClient } from "@/lib/supabase/server";
import { ChapterBriefResultSchema } from "@/lib/types";

import { WorkbenchClient } from "./workbench-client";

type Props = { params: Promise<{ id: string }> };

export default async function WorkbenchPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, mode, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();
  if (session.mode !== "dual") redirect(`/sessions/${id}`);

  const { data: books } = await supabase
    .from("books")
    .select(
      "id, title, position, word_count, chapter_count, created_at"
    )
    .eq("session_id", id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const bookIds = (books ?? []).map((b) => b.id);

  const [
    chaptersResult,
    analysesResult,
    blueprintResult,
    variantsResult,
  ] = await Promise.all([
    bookIds.length
      ? supabase
          .from("chapters")
          .select("id, book_id, index, title, start_char, end_char, source")
          .in("book_id", bookIds)
          .eq("user_id", user.id)
          .order("index", { ascending: true })
      : Promise.resolve({ data: [] as const }),
    bookIds.length
      ? supabase
          .from("analyses")
          .select("book_id, chapter_id, scope, dimension, result")
          .in("book_id", bookIds)
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as const }),
    supabase
      .from("blueprints")
      .select("id, status, sections, confirmed_at, updated_at")
      .eq("session_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("variants")
      .select("id, title, config, content, word_count, blueprint_id, created_at")
      .eq("session_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const chapters = (chaptersResult.data ?? []) as Array<{
    id: string;
    book_id: string;
    index: number;
    title: string;
    start_char: number;
    end_char: number;
    source: "regex" | "length-chunk" | "manual";
  }>;
  const analyses = (analysesResult.data ?? []) as Array<{
    book_id: string;
    chapter_id: string | null;
    scope: "book" | "chapter";
    dimension: string;
    result: unknown;
  }>;
  const variants = (variantsResult.data ?? []) as Array<{
    id: string;
    title: string;
    config: Record<string, unknown>;
    content: string;
    word_count: number | null;
    blueprint_id: string | null;
    created_at: string;
  }>;

  const briefs = analyses
    .filter((a) => a.scope === "chapter" && a.dimension === "chapter_brief" && a.chapter_id)
    .map((a) => {
      const parsed = ChapterBriefResultSchema.safeParse(a.result);
      return parsed.success
        ? { book_id: a.book_id, chapter_id: a.chapter_id as string, result: parsed.data }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const bookSynthesisByBook = new Set(
    analyses
      .filter((a) => a.scope === "book" && a.dimension === "book_synthesis")
      .map((a) => a.book_id)
  );

  const blueprintRow = blueprintResult.data;
  const blueprint = blueprintRow
    ? BlueprintSchema.parse(blueprintRow.sections ?? {})
    : emptyBlueprint();

  return (
    <WorkbenchClient
      session={session}
      books={books ?? []}
      chapters={chapters}
      briefs={briefs}
      bookSynthesisByBook={[...bookSynthesisByBook]}
      blueprintId={blueprintRow?.id ?? null}
      blueprintStatus={blueprintRow?.status ?? "draft"}
      blueprintUpdatedAt={blueprintRow?.updated_at ?? null}
      blueprintConfirmedAt={blueprintRow?.confirmed_at ?? null}
      blueprint={blueprint}
      variants={variants}
    />
  );
}
