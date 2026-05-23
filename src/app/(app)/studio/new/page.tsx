import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { BriefEditor } from "@/components/creative-brief/brief-editor";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CreativeBriefSchema } from "@/lib/types/creative-brief";

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
    .select("id, name, mode")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();

  return (
    <div className="app-page">
      <PageHeader
        label="创意简报"
        title={`新建简报 · ${session.name}`}
        description="先定义人物、情节、文风和保留规则，再把这份简报挂回项目主线。"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/studio?sessionId=${session.id}`}>返回创作台</Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="min-w-0">
          <BriefEditor
            mode={{ kind: "create", sessionId: session.id }}
            initial={CreativeBriefSchema.parse({})}
          />
        </div>
        <aside className="surface-panel p-6">
          <p className="eyebrow-label">项目上下文</p>
          <h2 className="mt-2 text-[20px] font-semibold text-foreground">
            {session.mode === "dual" ? "双书项目" : "单书兼容"}
          </h2>
          <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
            简报会被绑定到当前项目，用于 outline 预览、章节迭代和后续结果生成。
          </p>
        </aside>
      </div>
    </div>
  );
}
