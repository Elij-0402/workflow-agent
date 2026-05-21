import Link from "next/link";
import { ArrowRight, Loader2, Plus, Settings2, Sparkles, Waypoints } from "lucide-react";

import { TokenTrendChart } from "@/components/dashboard/token-trend-chart";
import { MetaRow } from "@/components/meta-row";
import { PageHeader } from "@/components/page-header";
import { ProjectCard } from "@/components/sessions/project-card";
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
    supabase.from("llm_config").select("id, provider, model, updated_at").maybeSingle(),
    supabase
      .from("sessions")
      .select("id, name, status, mode, created_at, updated_at")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(4),
  ]);

  const latestSession = recentSessions?.[0] ?? null;
  const nextSessions = (recentSessions ?? []).slice(1, 4);
  const totalActiveSessions = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);
  const activeSessionCount = totalActiveSessions.count ?? 0;
  let latestVariantCount = 0;
  if (latestSession) {
    const { count } = await supabase
      .from("variants")
      .select("*", { count: "exact", head: true })
      .eq("session_id", latestSession.id);
    latestVariantCount = count ?? 0;
  }

  // M5: token trend (last 30 days) + recent variants + inflight tasks
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: tokenRows }, { data: recentVariants }, { data: inflight }] = await Promise.all([
    supabase
      .from("analyses")
      .select("prompt_tokens, completion_tokens, created_at")
      .gte("created_at", since),
    supabase
      .from("variants")
      .select("id, title, session_id, scope, chapter_index, word_count, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("sessions")
      .select("id, name, status, mode, updated_at")
      .is("archived_at", null)
      .in("status", ["analyzing", "generating"])
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const trend = buildTokenTrend(tokenRows ?? []);
  const totalTokens = trend.reduce((sum, p) => sum + p.tokens, 0);

  const username = user?.email?.split("@")[0] ?? "创作者";
  const latestStatus = latestSession ? getSessionStatusMeta(latestSession.status) : null;
  const latestActionLabel = latestSession
    ? latestSession.mode === "dual"
      ? "进入工作台"
      : getSessionActionLabel(latestSession.status, latestVariantCount)
    : null;

  return (
    <div className="app-page">
      <PageHeader
        label="workspace"
        title={`${username}，回到你的创作任务`}
        description={
          llmConfig
            ? "从最近任务继续，或直接开始新的文本导入。当前界面先服务于单书工作流，但结构已经为后续多文本研究留好了余地。"
            : "先完成模型设置，再把导入、分析与生成链路跑起来。"
        }
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        <div className="surface-panel p-7">
          <div className="flex flex-col gap-6">
            {latestSession ? (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.10em]">
                    <StatusDot status={latestSession.status} />
                    <span className={latestStatus?.tone}>{latestStatus?.label}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground/80">
                      session · {latestSession.id.slice(0, 6)}
                    </span>
                  </div>
                  <h2 className="font-display text-[32px] italic leading-[1.08] tracking-[-0.005em] text-foreground">
                    {latestSession.name}
                  </h2>
                  <p className="max-w-2xl text-[14px] leading-7 text-muted-foreground">
                    {latestVariantCount > 0
                      ? "最近一次结果已经完成。继续查看分析、阅读结果，或再生成一个版本。"
                      : latestSession.status === "analyzed"
                        ? "三项分析已经准备好，下一步直接进入生成。"
                        : "继续完成当前文本的分析流程。"}
                  </p>
                </div>

                <MetaRow
                  items={[
                    {
                      label: "results",
                      value: latestVariantCount > 0 ? `${latestVariantCount} 个版本` : "尚未生成",
                    },
                    {
                      label: "updated",
                      value: formatRelativeTime(latestSession.updated_at),
                    },
                    {
                      label: "created",
                      value: formatDate(latestSession.created_at),
                    },
                  ]}
                />

                <div className="flex flex-col gap-3 border-t border-dashed border-border/70 pt-5 sm:flex-row sm:items-center">
                  <Button asChild className="h-10 px-5">
                    <Link
                      href={
                        latestSession.mode === "dual"
                          ? `/sessions/${latestSession.id}/workbench`
                          : `/sessions/${latestSession.id}`
                      }
                    >
                      {latestActionLabel}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Link
                    href="/sessions"
                    className="brass-underline text-[13px] text-muted-foreground transition-colors hover:text-primary"
                  >
                    查看全部任务
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="eyebrow-label">empty</p>
                <h2 className="font-display text-[32px] italic leading-[1.08] text-foreground">
                  还没有任务
                </h2>
                <p className="max-w-2xl text-[14px] leading-7 text-muted-foreground">
                  从一部小说开始。导入文本后，分析进度、生成结果和后续研究路径都会保留下来。
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <section className="surface-panel p-5">
            <p className="eyebrow-label">actions</p>
            <h3 className="mt-3 font-display text-[20px] italic text-foreground">开始新任务</h3>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              上传新的小说文本，直接进入分析页。
            </p>
            {!llmConfig ? (
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                先去
                <Link
                  href="/settings"
                  className="mx-1 text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
                >
                  设置
                </Link>
                里补上模型。
              </p>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              <Button
                asChild
                variant={latestSession ? "outline" : "default"}
                className="h-10 justify-center"
              >
                <Link href="/upload">
                  <Plus aria-hidden="true" />
                  {latestSession ? "新建任务" : "开始第一个任务"}
                </Link>
              </Button>
              <Button asChild variant="ghost" className="h-10 justify-center">
                <Link href="/settings">
                  <Settings2 aria-hidden="true" />
                  模型设置
                </Link>
              </Button>
            </div>
          </section>

          <section className="surface-subtle p-5">
            <div className="flex items-center gap-3">
              <Waypoints className="h-4 w-4 text-primary" />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
                {"// research"}
              </p>
            </div>
            <p className="mt-1 font-display text-[16px] italic text-foreground">研究方向</p>
            <p className="mt-3 text-[12.5px] leading-6 text-muted-foreground">
              当前版本先围绕单书分析与生成闭环展开，后续会在同一套工作台里接入多文本对照、双视角总结与更强的长文本处理能力。
            </p>
          </section>

          <section className="surface-subtle p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
                {"// model"}
              </p>
            </div>
            <p className="mt-2 font-mono text-[12px] text-foreground">
              {llmConfig ? `${llmConfig.provider} · ${llmConfig.model}` : "未配置"}
            </p>
            {llmConfig ? (
              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground/70">
                updated · {formatRelativeTime(llmConfig.updated_at)}
              </p>
            ) : null}
          </section>
        </div>
      </section>

      {nextSessions.length > 0 ? (
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <p className="eyebrow-label">continue</p>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              {nextSessions.length} of {activeSessionCount} active
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {nextSessions.map((s) => (
              <ProjectCard key={s.id} session={s} />
            ))}
          </div>
          {activeSessionCount > 4 ? (
            <div className="mt-3 text-right">
              <Link
                href="/sessions"
                className="brass-underline font-mono text-[11px] uppercase tracking-[0.10em] text-muted-foreground transition-colors hover:text-primary"
              >
                查看全部 {activeSessionCount} 个项目 →
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="surface-panel p-5">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
              {"// token spend · 30d"}
            </p>
            <span className="font-mono text-[11px] text-foreground">
              {totalTokens.toLocaleString("zh-CN")}
            </span>
          </div>
          <h3 className="mt-2 font-display text-[18px] italic text-foreground">
            最近 30 天 token 消耗
          </h3>
          <div className="mt-4">
            {trend.some((p) => p.tokens > 0) ? (
              <TokenTrendChart data={trend} />
            ) : (
              <p className="py-6 text-center text-[12.5px] text-muted-foreground">暂无消耗记录。</p>
            )}
          </div>
        </div>

        <div className="surface-panel p-5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
            {"// recent variants"}
          </p>
          <h3 className="mt-2 font-display text-[18px] italic text-foreground">最近变体</h3>
          <ul className="mt-4 space-y-2">
            {(recentVariants ?? []).length === 0 ? (
              <li className="text-[12.5px] text-muted-foreground">还没有生成过变体。</li>
            ) : (
              (recentVariants ?? []).map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-[3px] border border-border bg-background/40 px-3 py-2"
                >
                  <Link
                    href={`/sessions/${v.session_id}`}
                    className="min-w-0 flex-1 truncate text-[13px] text-foreground hover:text-primary"
                  >
                    {v.title || "（未命名）"}
                  </Link>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground/70">
                    {v.scope === "outline"
                      ? "outline"
                      : v.scope === "chapter"
                        ? `ch${v.chapter_index ?? "?"}`
                        : "full"}
                    {v.word_count ? ` · ${v.word_count.toLocaleString("zh-CN")} 字` : ""}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="surface-panel p-5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
            {"// inflight"}
          </p>
          <h3 className="mt-2 font-display text-[18px] italic text-foreground">进行中</h3>
          <ul className="mt-4 space-y-2">
            {(inflight ?? []).length === 0 ? (
              <li className="text-[12.5px] text-muted-foreground">暂无进行中的任务。</li>
            ) : (
              (inflight ?? []).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-[3px] border border-border bg-background/40 px-3 py-2"
                >
                  <Link
                    href={s.mode === "dual" ? `/sessions/${s.id}/workbench` : `/sessions/${s.id}`}
                    className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-foreground hover:text-primary"
                  >
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-primary" />
                    <span className="truncate">{s.name}</span>
                  </Link>
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-primary/80">
                    {s.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

function buildTokenTrend(
  rows: Array<{
    prompt_tokens: number | null;
    completion_tokens: number | null;
    created_at: string;
  }>,
): Array<{ day: string; tokens: number }> {
  const days = 30;
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    if (!buckets.has(key)) continue;
    const tokens = (r.prompt_tokens ?? 0) + (r.completion_tokens ?? 0);
    buckets.set(key, (buckets.get(key) ?? 0) + tokens);
  }
  return Array.from(buckets.entries()).map(([day, tokens]) => ({
    day: day.slice(5),
    tokens,
  }));
}

function getSessionActionLabel(status: string, variantCount: number) {
  if (variantCount > 0 || status === "done") {
    return "查看结果";
  }

  if (status === "analyzed") {
    return "生成变体";
  }

  return "继续";
}
