import { BookOpen, FolderKanban } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { safeGetUser } from "@/lib/supabase/auth";
import { loadSessionDashboard } from "@/lib/sessions/dashboard-server";

import { SessionsClient } from "./SessionsClient";
import { SessionsMetricsCollapsible } from "./sessions-metrics-collapsible";

export default async function SessionsPage() {
  const supabase = await createClient();
  const { user } = await safeGetUser(supabase, "sessions-page");

  const { sessions, summary, recentEvents } = user
    ? await loadSessionDashboard({
        supabase,
        userId: user.id,
        view: "active",
      })
    : { sessions: [], summary: null, recentEvents: [] };

  return (
    <div className="app-page space-y-10">
      <PageHeader
        label="项目总览"
        title="把创作流水线放到台面上"
        description="从这里判断每个项目现在到哪一步、卡在哪里、下一步该做什么。双书项目是主路线，单书模式保留为兼容流程。"
        action={
          <Button asChild>
            <Link href="/upload?mode=dual">新建双书项目</Link>
          </Button>
        }
      />

      <section className="surface-panel space-y-6 p-6">
        <div>
          <p className="eyebrow-label">主状态</p>
          <h2 className="type-display mt-3 leading-tight">
            {summary?.activeProjectCount ?? 0} 个项目正在推进
          </h2>
          <p className="type-body mt-3 max-w-2xl text-muted-foreground">
            先处理待确认蓝图的项目，再推进可生成项目。生成结果和创意简报都回到项目主线上管理。
          </p>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="eyebrow-label">快速入口</p>
            <FolderKanban
              className="h-5 w-5 text-muted-foreground"
              aria-hidden
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <LinkCard
              href="/upload?mode=dual"
              title="双书项目"
              description="导入两本参考书，走完整的分析、蓝图和生成流程。"
            />
            <LinkCard
              href="/upload?mode=single"
              title="单书兼容"
              description="继续处理历史单书任务，保留原有分析与生成能力。"
            />
            <LinkCard
              href="/library"
              title="资料库"
              description="查看已归档的项目列表。"
            />
          </div>
        </div>
      </section>

      <SessionsMetricsCollapsible summary={summary} />

      {sessions.length > 0 ? (
        <SessionsClient
          sessions={sessions}
          view="active"
          recentEvents={recentEvents}
        />
      ) : (
        <EmptyState
          icon={BookOpen}
          title="还没有项目"
          description="先创建一个双书项目，把两本参考小说导入进来。后续的分析、蓝图、简报和结果都会挂在同一个项目下面。"
          className="py-14"
          action={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/upload?mode=dual">新建双书项目</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/upload?mode=single">进入单书兼容流程</Link>
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}

function LinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="surface-subtle block px-4 py-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
    >
      <p className="type-body font-medium">{title}</p>
      <p className="type-caption mt-1 leading-6">{description}</p>
    </Link>
  );
}
