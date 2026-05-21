import Link from "next/link";
import { ArrowRight, Loader2, Settings2, Sparkles } from "lucide-react";

import { TokenTrendChart } from "@/components/dashboard/token-trend-chart";
import { DismissibleTip } from "@/components/dismissible-tip";
import { MetaRow } from "@/components/meta-row";
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
      .limit(1),
  ]);

  const username = user?.email?.split("@")[0] ?? "创作者";

  if (!llmConfig) {
    return (
      <div className="app-page flex flex-col items-center justify-center py-24">
        <div className="surface-panel max-w-md p-8 text-center">
          <Settings2 className="mx-auto h-10 w-10 text-primary/70" strokeWidth={1.5} aria-hidden />
          <h1 className="mt-5 text-[22px] font-medium leading-tight text-foreground">
            配置模型后可使用
          </h1>
          <p className="mt-3 text-[13.5px] leading-7 text-muted-foreground">
            连接 OpenAI、DeepSeek 或自定义 OpenAI-compatible 接口后，就可以开始导入小说并分析。
          </p>
          <Button asChild className="mt-6 h-10 px-5">
            <Link href="/settings">
              去配置模型
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const latestSession = recentSessions?.[0] ?? null;

  if (!latestSession) {
    return (
      <div className="app-page flex flex-col items-center justify-center py-24">
        <div className="surface-panel max-w-md p-8 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary/70" strokeWidth={1.5} aria-hidden />
          <h1 className="mt-5 text-[22px] font-medium leading-tight text-foreground">
            {username}，开始第一部小说
          </h1>
          <p className="mt-3 text-[13.5px] leading-7 text-muted-foreground">
            上传一份 .txt 小说，系统会自动拆分章节、抽取世界观、人物与叙事结构。
          </p>
          <Button asChild className="mt-6 h-10 px-5">
            <Link href="/upload">
              上传第一本小说
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const { count: latestVariantCount } = await supabase
    .from("variants")
    .select("*", { count: "exact", head: true })
    .eq("session_id", latestSession.id);
  const variantCount = latestVariantCount ?? 0;

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
      .limit(3),
    supabase
      .from("sessions")
      .select("id, name, status, mode, updated_at")
      .is("archived_at", null)
      .in("status", ["analyzing", "generating"])
      .order("updated_at", { ascending: false })
      .limit(3),
  ]);

  const trend = buildTokenTrend(tokenRows ?? []);
  const totalTokens = trend.reduce((sum, p) => sum + p.tokens, 0);
  const hasTokenData = trend.some((p) => p.tokens > 0);

  const latestStatus = getSessionStatusMeta(latestSession.status);
  const latestActionLabel =
    latestSession.mode === "dual"
      ? "进入工作台"
      : getSessionActionLabel(latestSession.status, variantCount);
  const latestHref =
    latestSession.mode === "dual"
      ? `/sessions/${latestSession.id}/workbench`
      : `/sessions/${latestSession.id}`;

  return (
    <div className="app-page">
      <div className="mb-2">
        <h1 className="text-[20px] font-medium leading-tight text-foreground">
          {username}，回到你的创作任务
        </h1>
      </div>

      <DismissibleTip storageKey="dashboard-cmdk">
        提示：按{" "}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10.5px]">
          ⌘K
        </kbd>{" "}
        可以随时打开命令面板，跳转到任意页面。
      </DismissibleTip>

      <section className="surface-panel p-7">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.10em]">
              <StatusDot status={latestSession.status} />
              <span className={latestStatus.tone}>{latestStatus.label}</span>
            </div>
            <h2 className="font-display text-[28px] italic leading-[1.08] tracking-[-0.005em] text-foreground">
              {latestSession.name}
            </h2>
            <p className="max-w-2xl text-[13.5px] leading-7 text-muted-foreground">
              {variantCount > 0
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
                value: variantCount > 0 ? `${variantCount} 个版本` : "尚未生成",
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
              <Link href={latestHref}>
                {latestActionLabel}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Link
              href="/sessions"
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              查看全部任务 →
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="surface-panel p-5">
          <h3 className="text-[14px] font-medium text-foreground">最近变体</h3>
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
          <h3 className="text-[14px] font-medium text-foreground">进行中</h3>
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

      {hasTokenData ? (
        <section className="surface-subtle p-5">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[13px] font-medium text-muted-foreground">最近 30 天 token 消耗</h3>
            <span className="font-mono text-[11px] text-foreground">
              {totalTokens.toLocaleString("zh-CN")}
            </span>
          </div>
          <div className="mt-4">
            <TokenTrendChart data={trend} />
          </div>
        </section>
      ) : null}
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
