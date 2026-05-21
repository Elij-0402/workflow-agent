import { notFound, redirect } from "next/navigation";

import { BriefEditor } from "@/components/creative-brief/brief-editor";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ sessionId?: string }>;
};

export default async function NewBriefPage({ searchParams }: Props) {
  const { sessionId } = await searchParams;
  if (!sessionId) redirect("/studio");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, name")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();

  return (
    <div className="app-page">
      <PageHeader
        label="brief · new"
        title="新建创意简报"
        description={`为「${session.name}」创建简报，保存后可在变体生成时引用。`}
      />
      <BriefEditor mode={{ kind: "create", sessionId }} />
    </div>
  );
}
