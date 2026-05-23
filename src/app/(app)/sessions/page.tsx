import { BookOpen, FolderKanban } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { safeGetUser } from "@/lib/supabase/auth";
import { loadSessionDashboard } from "@/lib/sessions/dashboard-server";

import { SessionsClient } from "./SessionsClient";

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
    <div className="app-page">
      <PageHeader
        label="项目总览"
        title="把创作流水线放到台面上"
        description="从这里判断每个项目现在到哪一步、卡在哪里、下一步该做什么。双书项目是主路线，单书模式保留为兼容流程。"
        action={
          <Button asChild>
            <Link href="/create">新建项目</Link>
          </Button>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1.5fr_.9fr]">
        <div className="surface-panel p-6">
          <p className="eyebrow-label">主状态</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[28px] font-semibold leading-tight text-foreground">
                {summary?.activeProjectCount ?? 0} 个项目正在推进
              </h2>
              <p className="mt-3 max-w-2xl text-[13px] leading-7 text-muted-foreground">
                先处理待确认蓝图的项目，再推进可生成项目。生成结果和创意简报都回到项目主线上管理。
              </p>
            </div>
            <div className="grid min-w-[240px] grid-cols-2 gap-3">
              <QuickStat
                label="待确认蓝图"
                value={String(summary?.waitingBlueprintCount ?? 0)}
              />
              <QuickStat
                label="活跃简报"
                value={String(summary?.activeBriefCount ?? 0)}
              />
            </div>
          </div>
        </div>

        <div className="surface-panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow-label">快速入口</p>
              <h2 className="mt-2 text-[18px] font-semibold text-foreground">
                从项目主线开始
              </h2>
            </div>
            <FolderKanban className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div className="mt-5 grid gap-3">
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
              description="查看归档项目和最近生成结果。"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="活跃项目" value={String(summary?.activeProjectCount ?? 0)} />
        <MetricCard label="待确认蓝图" value={String(summary?.waitingBlueprintCount ?? 0)} />
        <MetricCard label="活跃简报" value={String(summary?.activeBriefCount ?? 0)} />
        <MetricCard label="已生成版本" value={String(summary?.generatedVariantCount ?? 0)} />
      </section>

      {sessions.length > 0 ? (
        <SessionsClient sessions={sessions} view="active" recentEvents={recentEvents} />
      ) : (
        <div className="surface-panel flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
          <BookOpen
            className="h-12 w-12 text-primary/60"
            strokeWidth={1.5}
            aria-hidden
          />
          <h3 className="text-[18px] font-semibold leading-tight text-foreground">
            还没有项目
          </h3>
          <p className="max-w-md text-[13px] leading-6 text-muted-foreground">
            先创建一个双书项目，把两本参考小说导入进来。后续的分析、蓝图、简报和结果都会挂在同一个项目下面。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/create">开始新项目</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/upload?mode=single">进入单书兼容流程</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-5">
      <p className="eyebrow-label">{label}</p>
      <p className="mt-3 text-[26px] font-semibold leading-none text-foreground">
        {value}
      </p>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-subtle px-4 py-3">
      <p className="mono-label-sm">{label}</p>
      <p className="mt-2 text-[18px] font-semibold text-foreground">{value}</p>
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
      <p className="text-[14px] font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}
