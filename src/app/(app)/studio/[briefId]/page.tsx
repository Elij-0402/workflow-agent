import { notFound } from "next/navigation";
import Link from "next/link";

import { StudioWorkspace } from "@/components/creative-brief/studio-workspace";
import type { ChapterVariantSummary } from "@/components/creative-brief/chapter-iterate-streamer";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { OutlineSchema } from "@/lib/prompts/preview-outline";
import { createClient } from "@/lib/supabase/server";
import {
  CreativeBriefSchema,
  type CreativeBrief,
} from "@/lib/types/creative-brief";

type Props = {
  params: Promise<{ briefId: string }>;
};

export default async function StudioBriefPage({ params }: Props) {
  const { briefId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  if (briefId === "new") {
    notFound();
  }

  const { data: row } = await supabase
    .from("creative_briefs")
    .select("*")
    .eq("id", briefId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) notFound();

  const initial: CreativeBrief = CreativeBriefSchema.parse({
    title: row.title,
    persona_directives: row.persona_directives,
    plot_directives: row.plot_directives,
    style_directives: row.style_directives,
    retention_rules: row.retention_rules,
  });

  const [{ data: session }, { data: variants }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, name, mode")
      .eq("id", row.session_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("variants")
      .select("id, title, scope, content, word_count, chapter_index, created_at")
      .eq("brief_id", briefId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const outlineRows = (variants ?? []).filter((variant) => variant.scope === "outline");
  const outlineVariant = outlineRows[outlineRows.length - 1] ?? null;
  let initialOutline = null;
  if (outlineVariant?.content) {
    const parsed = OutlineSchema.safeParse(JSON.parse(outlineVariant.content));
    if (parsed.success) initialOutline = parsed.data;
  }

  const initialChapterVariants: ChapterVariantSummary[] = (variants ?? [])
    .filter((variant) => variant.scope === "chapter" && variant.chapter_index)
    .map((variant) => ({
      id: variant.id,
      chapterIndex: variant.chapter_index as number,
      title: variant.title,
      content: variant.content,
      wordCount: variant.word_count,
      createdAt: variant.created_at,
    }));

  const backHref = session
    ? `/sessions/${session.id}${session.mode === "dual" ? "?step=generate" : ""}`
    : "/studio";

  return (
    <div className="app-page">
      <PageHeader
        label="创意简报"
        title={row.title || "未命名简报"}
        description={`所属项目：${session?.name ?? "未知"}`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>返回项目</Link>
          </Button>
        }
      />
      <StudioWorkspace
        briefId={briefId}
        initial={initial}
        initialOutlineVariantId={outlineVariant?.id ?? null}
        initialOutline={initialOutline}
        initialChapterVariants={initialChapterVariants}
      />
    </div>
  );
}
