import Link from "next/link";
import { ArrowRight, Plus, Settings2 } from "lucide-react";

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
    <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-8 px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <PageHeader
        title={`${username}，回到你的创作任务`}
        description={
          llmConfig
            ? "只保留最短路径：继续当前任务，或马上开始新的文本导入。"
            : "先把任务跑起来。需要分析时，再补上模型设置。"
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <div className="rounded-lg border border-border/60 bg-card/40 p-6">
          <div className="space-y-4">
            {latestSession ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <StatusDot status={latestSession.status} />
                    <span className={latestStatus?.tone}>{latestStatus?.label}</span>
                  </div>
                  <h2 className="text-[22px] font-medium tracking-tight text-foreground">
                    {latestSession.name}
                  </h2>
                  <p className="max-w-2xl text-[14px] leading-6 text-muted-foreground">
                    {latestVariantCount > 0
                      ? "最近一次结果已经生成完成，继续查看、对比，或再生成一个版本。"
                      : latestSession.status === "analyzed"
                        ? "分析已经准备好，下一步直接生成结果。"
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

                <div className="flex flex-wrap items-center gap-3 pt-2">
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
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h2 className="text-[22px] font-medium tracking-tight text-foreground">
                    还没有任务
                  </h2>
                  <p className="max-w-2xl text-[14px] leading-6 text-muted-foreground">
                    从一部小说开始。导入文本后，你的分析进度和生成结果都会保留下来。
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/sessions"
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    查看任务记录
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/20 p-6">
          <div className="space-y-3">
            <h2 className="text-[18px] font-medium text-foreground">开始新任务</h2>
            <p className="text-[14px] leading-6 text-muted-foreground">
              上传一份新的小说文本，直接进入分析页。
            </p>
            {!llmConfig ? (
              <p className="text-[13px] leading-6 text-muted-foreground">
                需要开始分析时，再去
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
          </div>

          <div className="mt-6 flex flex-col gap-3">
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
