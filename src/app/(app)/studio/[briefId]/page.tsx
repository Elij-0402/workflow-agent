import { notFound } from "next/navigation";
import Link from "next/link";

import { BriefEditor } from "@/components/creative-brief/brief-editor";
import { OutlineStreamer } from "@/components/creative-brief/outline-streamer";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CreativeBriefSchema, type CreativeBrief } from "@/lib/types/creative-brief";

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

  const { data: session } = await supabase
    .from("sessions")
    .select("id, name, mode")
    .eq("id", row.session_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const backHref = session
    ? session.mode === "dual"
      ? `/sessions/${session.id}/workbench`
      : `/sessions/${session.id}`
    : "/studio";

  return (
    <div className="app-page">
      <PageHeader
        label="brief"
        title={row.title || "未命名简报"}
        description={`所属项目：${session?.name ?? "未知"}`}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>返回项目</Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2 xl:gap-8">
        <div className="min-w-0">
          <BriefEditor mode={{ kind: "edit", briefId }} initial={initial} />
        </div>
        <section className="min-w-0 xl:border-l xl:border-border/60 xl:pl-8">
          <OutlineStreamer briefId={briefId} />
        </section>
      </div>
    </div>
  );
}
