import Link from "next/link";
import { ArrowRight, Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessionStatusMeta, StatusDot } from "@/components/status-dot";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: llmConfig }, { data: recentSessions }] = await Promise.all([
    supabase
      .from("llm_config")
      .select("id, provider, model, updated_at")
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, name, status, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  const recentSessionIds = recentSessions?.map((session) => session.id) ?? [];
  const variantCountMap = new Map<string, number>();

  if (recentSessionIds.length > 0) {
    const { data: variantRows } = await supabase
      .from("variants")
      .select("session_id")
      .in("session_id", recentSessionIds);

    for (const sessionId of recentSessionIds) {
      variantCountMap.set(sessionId, 0);
    }

    for (const row of variantRows ?? []) {
      variantCountMap.set(row.session_id, (variantCountMap.get(row.session_id) ?? 0) + 1);
    }
  }

  const latestSession = recentSessions?.[0] ?? null;
  const latestVariantCount = latestSession
    ? (variantCountMap.get(latestSession.id) ?? 0)
    : 0;
  const username = user?.email?.split("@")[0] ?? "创作者";
  const workspaceSummary = latestSession
    ? latestVariantCount > 0
      ? "继续查看最近一次生成结果与分析上下文。"
      : latestSession.status === "analyzed"
        ? "最近一次会话已经分析完成，可以直接生成变体。"
        : "继续处理最近一次分析与生成流程。"
    : "从一部小说开始，建立你的第一条分析工作流。";
  const latestStatus = latestSession
    ? getSessionStatusMeta(latestSession.status)
    : null;
  const latestActionLabel = latestSession
    ? getSessionActionLabel(latestSession.status, latestVariantCount)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <section className="max-w-2xl space-y-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          工作台
        </p>
        <h1 className="text-balance text-[26px] font-medium tracking-tight sm:text-[30px]">
          {username}，继续你的创作流程
        </h1>
        <p className="text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
          {workspaceSummary}
        </p>
      </section>

      <section className="rounded-lg border border-border/70 bg-card/40">
        <div className="flex flex-col gap-6 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                继续上次工作
              </p>
              {latestSession ? (
                <>
                  <h2 className="text-pretty text-[20px] font-medium text-foreground">
                    {latestSession.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <StatusDot status={latestSession.status} />
                      <span className={latestStatus?.tone}>{latestStatus?.label}</span>
                    </span>
                    <span className="text-muted-foreground/40" aria-hidden="true">
                      /
                    </span>
                    <span>
                      {latestVariantCount > 0
                        ? `${latestVariantCount} 个变体`
                        : "未生成变体"}
                    </span>
                    <span className="text-muted-foreground/40" aria-hidden="true">
                      /
                    </span>
                    <span>更新于 {formatRelativeTime(latestSession.updated_at)}</span>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-[20px] font-medium text-foreground">
                    还没有进行中的工作
                  </h2>
                  <p className="max-w-xl text-[14px] leading-6 text-muted-foreground">
                    上传小说后，系统会为你保存完整的分析与生成流程，方便随时继续。
                  </p>
                </>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {latestSession ? (
                <>
                  <Button asChild className="h-10 px-4">
                    <Link href={`/sessions/${latestSession.id}`}>
                      {latestActionLabel}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <p className="text-[12px] text-muted-foreground">
                    最后活动 {formatDate(latestSession.updated_at)}
                  </p>
                </>
              ) : (
                <>
                  <Button asChild className="h-10 px-4">
                    <Link href="/upload">
                      <Plus aria-hidden="true" />
                      上传第一部小说
                    </Link>
                  </Button>
                  <p className="text-[12px] text-muted-foreground">
                    从文本上传开始建立工作流
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActionLink
              href="/upload"
              title="新建分析任务"
              body="上传新的小说文本，开始下一条分析流程。"
            />
            <ActionLink
              href="/sessions"
              title="查看全部会话"
              body="进入历史记录，回到最近完成或处理中任务。"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[16px] font-medium text-foreground">最近会话</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              按最近更新时间排序，帮助你快速回到正在推进的任务。
            </p>
          </div>
          {recentSessions && recentSessions.length > 0 ? (
            <Link
              href="/sessions"
              className="inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              查看全部
              <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {recentSessions && recentSessions.length > 0 ? (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/70 bg-card/30">
            {recentSessions.map((session) => {
              const status = getSessionStatusMeta(session.status);
              const variantCount = variantCountMap.get(session.id) ?? 0;
              const actionLabel = getSessionActionLabel(session.status, variantCount);

              return (
                <li key={session.id}>
                  <Link
                    href={`/sessions/${session.id}`}
                    className="flex min-w-0 items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <StatusDot status={session.status} />
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-foreground">
                          {session.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                          <span>{status.label}</span>
                          <span className="text-muted-foreground/40" aria-hidden="true">
                            /
                          </span>
                          <span>
                            {variantCount > 0
                              ? `${variantCount} 个变体`
                              : "未生成变体"}
                          </span>
                          <span className="text-muted-foreground/40" aria-hidden="true">
                            /
                          </span>
                          <span>创建于 {formatDate(session.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[12px] text-muted-foreground">
                        {formatRelativeTime(session.updated_at)}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-foreground">
                        {actionLabel}
                        <ArrowRight aria-hidden="true" className="h-3 w-3" />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 px-5 py-10">
            <div className="max-w-lg space-y-2">
              <h3 className="text-[15px] font-medium text-foreground">
                还没有分析记录
              </h3>
              <p className="text-[13px] leading-6 text-muted-foreground">
                上传第一部小说后，这里会保存每一次上传、分析与生成流程，方便你继续处理。
              </p>
              <Button asChild variant="outline" className="mt-2 h-9">
                <Link href="/upload">
                  <Plus aria-hidden="true" />
                  上传小说
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-[16px] font-medium text-foreground">系统状态</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            将模型配置集中展示，避免把关键设置散落在页面里。
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-lg border border-border/70 bg-card/30 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                  LLM 配置
                </p>
                {llmConfig ? (
                  <>
                    <h3 className="text-[18px] font-medium text-foreground">
                      已准备就绪
                    </h3>
                    <p className="text-[13px] leading-6 text-muted-foreground">
                      当前模型
                      {" "}
                      <span translate="no" className="font-mono text-foreground">
                        {llmConfig.model}
                      </span>
                      ，可直接用于分析与生成。
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-[18px] font-medium text-foreground">
                      尚未配置模型
                    </h3>
                    <p className="text-[13px] leading-6 text-muted-foreground">
                      先保存服务提供方、模型 ID 与 API Key，之后才能运行分析任务。
                    </p>
                  </>
                )}
              </div>
              <div className="shrink-0 rounded-full border border-border/70 px-3 py-1 text-[12px] text-muted-foreground">
                {llmConfig ? "可用" : "待配置"}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
              {llmConfig ? (
                <>
                  <span>
                    服务提供方
                    {" "}
                    <span translate="no" className="text-foreground">
                      {llmConfig.provider}
                    </span>
                  </span>
                  <span className="text-muted-foreground/40" aria-hidden="true">
                    /
                  </span>
                  <span>最近更新 {formatRelativeTime(llmConfig.updated_at)}</span>
                </>
              ) : (
                <span>当前没有可用的模型配置。</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-card/30 px-5 py-5">
            <div className="space-y-2">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
                下一步
              </p>
              <h3 className="text-[18px] font-medium text-foreground">
                {llmConfig ? "检查并继续任务" : "先完成模型设置"}
              </h3>
              <p className="text-[13px] leading-6 text-muted-foreground">
                {llmConfig
                  ? "模型已经可用。你可以继续最近一次会话，或上传新的小说文本。"
                  : "完成模型配置后，仪表盘会自动切换到可继续执行的工作状态。"}
              </p>
            </div>
            <Button asChild variant="outline" className="mt-5 h-9">
              <Link href="/settings">
                <Settings2 aria-hidden="true" />
                {llmConfig ? "管理模型配置" : "前往配置模型"}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function getSessionActionLabel(status: string, variantCount: number) {
  if (variantCount > 0 || status === "done") {
    return "查看变体";
  }

  if (status === "analyzed") {
    return "生成变体";
  }

  return "继续分析";
}

function ActionLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-border/60 px-4 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="text-[14px] font-medium text-foreground">{title}</div>
          <p className="text-[13px] leading-6 text-muted-foreground">{body}</p>
        </div>
        <ArrowRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}
