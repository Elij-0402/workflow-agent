import Link from "next/link";
import { ArrowRight, Plus, Settings2, Sparkles, Waypoints } from "lucide-react";

import { MetaRow } from "@/components/meta-row";
import { PageHeader } from "@/components/page-header";
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
      .select("id, name, status, mode, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  const latestSession = recentSessions?.[0] ?? null;
  let latestVariantCount = 0;
  if (latestSession) {
    const { count } = await supabase
      .from("variants")
      .select("*", { count: "exact", head: true })
      .eq("session_id", latestSession.id);
    latestVariantCount = count ?? 0;
  }

  const username = user?.email?.split("@")[0] ?? "创作者";
  const latestStatus = latestSession
    ? getSessionStatusMeta(latestSession.status)
    : null;
  const latestActionLabel = latestSession
    ? latestSession.mode === "dual"
      ? "$ open workbench"
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
                    <span className={latestStatus?.tone}>
                      {latestStatus?.label}
                    </span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-muted-foreground/80">
                      session · {latestSession.id.slice(0, 6)}
                    </span>
                  </div>
                  <h2 className="font-display italic text-[32px] leading-[1.08] tracking-[-0.005em] text-foreground">
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
                      value:
                        latestVariantCount > 0
                          ? `${latestVariantCount} 个版本`
                          : "尚未生成",
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
                  <Button asChild className="h-10 px-5 font-mono uppercase tracking-[0.08em]">
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
                    className="brass-underline font-mono text-[12px] uppercase tracking-[0.10em] text-muted-foreground transition-colors hover:text-primary"
                  >
                    $ view all sessions
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  <p className="eyebrow-label">empty</p>
                  <h2 className="font-display italic text-[32px] leading-[1.08] text-foreground">
                    还没有任务
                  </h2>
                  <p className="max-w-2xl text-[14px] leading-7 text-muted-foreground">
                    从一部小说开始。导入文本后，分析进度、生成结果和后续研究路径都会保留下来。
                  </p>
                </div>
                <pre className="surface-subtle whitespace-pre overflow-x-auto p-6 font-mono text-[12px] leading-6 text-muted-foreground">
{`┌──── workspace · empty ─────────────┐
│                                    │
│   no session yet                   │
│                                    │
│   $ upload your first .txt         │
│   $ run three-dimension analysis   │
│   $ generate a variant             │
│                                    │
└────────────────────────────────────┘`}
                </pre>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <section className="surface-panel p-5">
            <p className="eyebrow-label">actions</p>
            <h3 className="mt-3 font-display italic text-[20px] text-foreground">
              开始新任务
            </h3>
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
                className="h-10 justify-center font-mono uppercase tracking-[0.08em]"
              >
                <Link href="/upload">
                  <Plus aria-hidden="true" />
                  {latestSession ? "$ new task" : "$ first task"}
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="h-10 justify-center font-mono uppercase tracking-[0.08em]"
              >
                <Link href="/settings">
                  <Settings2 aria-hidden="true" />
                  $ model config
                </Link>
              </Button>
            </div>
          </section>

          <section className="surface-subtle p-5">
            <div className="flex items-center gap-3">
              <Waypoints className="h-4 w-4 text-primary" />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
                {"// research"}</p>
            </div>
            <p className="mt-1 font-display italic text-[16px] text-foreground">
              研究方向
            </p>
            <p className="mt-3 text-[12.5px] leading-6 text-muted-foreground">
              当前版本先围绕单书分析与生成闭环展开，后续会在同一套工作台里接入多文本对照、双视角总结与更强的长文本处理能力。
            </p>
          </section>

          <section className="surface-subtle p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-primary/85">
                {"// model"}</p>
            </div>
            <p className="mt-2 font-mono text-[12px] text-foreground">
              {llmConfig
                ? `${llmConfig.provider} · ${llmConfig.model}`
                : "未配置"}
            </p>
            {llmConfig ? (
              <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground/70">
                updated · {formatRelativeTime(llmConfig.updated_at)}
              </p>
            ) : null}
          </section>
        </div>
      </section>
    </div>
  );
}

function getSessionActionLabel(status: string, variantCount: number) {
  if (variantCount > 0 || status === "done") {
    return "$ view results";
  }

  if (status === "analyzed") {
    return "$ generate";
  }

  return "$ continue";
}
