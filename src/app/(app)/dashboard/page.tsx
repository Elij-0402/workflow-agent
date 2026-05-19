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
      .select("id, name, status, created_at, updated_at")
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
    ? getSessionActionLabel(latestSession.status, latestVariantCount)
    : null;

  return (
    <div className="app-page">
      <PageHeader
        label="Workspace"
        title={`${username}，回到你的创作任务`}
        description={
          llmConfig
            ? "从最近任务继续，或直接开始新的文本导入。当前界面先服务于单书工作流，但结构已经为后续多文本研究留好了余地。"
            : "先完成模型设置，再把导入、分析与生成链路跑起来。"
        }
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_320px]">
        <div className="surface-panel p-6">
          <div className="flex flex-col gap-5">
            {latestSession ? (
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                    <StatusDot status={latestSession.status} />
                    <span className={latestStatus?.tone}>{latestStatus?.label}</span>
                  </div>
                  <h2 className="text-[24px] font-medium tracking-tight text-foreground">
                    {latestSession.name}
                  </h2>
                  <p className="max-w-2xl text-[14px] leading-6 text-muted-foreground">
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
                      label: "结果",
                      value:
                        latestVariantCount > 0
                          ? `${latestVariantCount} 个版本`
                          : "尚未生成",
                    },
                    {
                      label: "最近更新",
                      value: formatRelativeTime(latestSession.updated_at),
                    },
                    {
                      label: "创建时间",
                      value: formatDate(latestSession.created_at),
                    },
                  ]}
                />

                <div className="grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-[auto_auto_1fr] sm:items-center">
                  <Button asChild className="h-10 px-4">
                    <Link href={`/sessions/${latestSession.id}`}>
                      {latestActionLabel}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Link
                    href="/sessions"
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    查看任务记录
                  </Link>
                  <div className="hidden sm:block" />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <h2 className="text-[24px] font-medium tracking-tight text-foreground">
                    还没有任务
                  </h2>
                  <p className="max-w-2xl text-[14px] leading-6 text-muted-foreground">
                    从一部小说开始。导入文本后，分析进度、生成结果和后续研究路径都会保留下来。
                  </p>
                </div>
                <div className="surface-subtle flex min-h-[180px] items-center justify-center p-6">
                  <div className="max-w-sm text-center">
                    <p className="text-[14px] font-medium text-foreground">
                      当前工作区为空
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                      先导入第一份文本，工作台就会开始积累任务状态、分析记录和结果阅读面板。
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <section className="surface-panel p-5">
            <p className="eyebrow-label">Actions</p>
            <h2 className="mt-2 text-[18px] font-medium text-foreground">开始新任务</h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              上传新的小说文本，直接进入分析页。
            </p>
            {!llmConfig ? (
              <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                开始分析前，先去
                {" "}
                <Link
                  href="/settings"
                  className="text-foreground underline decoration-border underline-offset-4"
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
              <div className="flex size-8 items-center justify-center rounded-[7px] border border-border/80 bg-background/80 text-primary">
                <Waypoints className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">研究方向</p>
                <p className="text-[12px] text-muted-foreground">为下一轮功能铺路</p>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
              当前版本先围绕单书分析与生成闭环展开，后续会在同一套工作台里接入多文本对照、双视角总结与更强的长文本处理能力。
            </p>
          </section>

          <section className="surface-subtle p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-[7px] border border-border/80 bg-background/80 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">模型状态</p>
                <p className="text-[12px] text-muted-foreground">
                  {llmConfig ? `${llmConfig.provider} · ${llmConfig.model}` : "尚未配置"}
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function getSessionActionLabel(status: string, variantCount: number) {
  if (variantCount > 0 || status === "done") {
    return "查看结果";
  }

  if (status === "analyzed") {
    return "生成结果";
  }

  return "继续分析";
}
