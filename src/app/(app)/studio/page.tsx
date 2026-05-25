import Link from "next/link";
import { Layers3, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { BriefCreateSheet } from "@/components/studio/brief-create-sheet";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { safeGetUser } from "@/lib/supabase/auth";
import { formatRelativeTime } from "@/lib/utils";

type Props = {
  searchParams: Promise<{ sessionId?: string }>;
};

export default async function StudioPage({ searchParams }: Props) {
  const { sessionId } = await searchParams;
  const supabase = await createClient();
  const { user } = await safeGetUser(supabase, "studio-page");

  const sessionsResult = user
    ? await supabase
        .from("sessions")
        .select("id, name, mode, archived_at")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
    : { data: [] };

  const sessions = (sessionsResult.data ?? []).map((session) => ({
    id: session.id,
    name: session.name,
    mode: session.mode,
  }));

  const briefsResult = user
    ? await supabase
        .from("creative_briefs")
        .select("id, title, status, updated_at, session_id")
        .eq("user_id", user.id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false })
    : { data: [] };

  const sessionMap = new Map(
    (sessionsResult.data ?? []).map((session) => [session.id, session]),
  );
  const briefs = (briefsResult.data ?? []).map((brief) => ({
    ...brief,
    session: sessionMap.get(brief.session_id) ?? null,
  }));

  const focusedBriefs = sessionId
    ? briefs.filter((brief) => brief.session_id === sessionId)
    : briefs;

  return (
    <div className="app-page">
      <PageHeader
        label="创作台"
        title="让简报和结果继续为项目服务"
        description="这里集中管理创意简报、预览生成和迭代入口。简报不是孤立对象，而是项目主线里的创作控制层。"
        action={<BriefCreateSheet sessions={sessions} />}
      />

      <section className="grid gap-4 xl:grid-cols-[1.4fr_.95fr]">
        <div className="surface-panel p-6">
          <p className="eyebrow-label">当前状态</p>
          <h2 className="mt-2 text-[24px] font-semibold text-foreground">
            {focusedBriefs.length} 份简报可继续推进
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-7 text-muted-foreground">
            优先让活跃简报绑定到明确项目，再从简报进入 outline
            预览或章节迭代。这样生成结果才能回到项目的结果链路里。
          </p>
        </div>

        <div className="surface-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">项目上下文</p>
              <h2 className="mt-2 text-[18px] font-semibold text-foreground">
                最近项目
              </h2>
            </div>
            <Layers3 className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="mt-5 space-y-3">
            {sessions.slice(0, 4).map((session) => (
              <Link
                key={session.id}
                href={`/studio?sessionId=${session.id}`}
                className="surface-subtle block px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <p className="text-[13px] text-foreground">{session.name}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {session.mode === "dual" ? "双书项目" : "单书兼容"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {focusedBriefs.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {focusedBriefs.map((brief) => (
            <article key={brief.id} className="surface-panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow-label">
                    {brief.status === "active" ? "活跃简报" : "草稿简报"}
                  </p>
                  <h2 className="mt-2 text-[18px] font-semibold text-foreground">
                    {brief.title || "未命名简报"}
                  </h2>
                </div>
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
                所属项目：{brief.session?.name ?? "未知项目"}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                最近更新 · {formatRelativeTime(brief.updated_at)}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={`/studio/${brief.id}`}>打开简报</Link>
                </Button>
                {brief.session ? (
                  <Button asChild variant="outline">
                    <Link href={`/sessions/${brief.session.id}`}>查看项目</Link>
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="还没有可用简报"
          description="先在某个项目下创建一份创意简报，用它来约束人物、情节、文风和保留规则。"
          className="py-14"
        />
      )}
    </div>
  );
}
