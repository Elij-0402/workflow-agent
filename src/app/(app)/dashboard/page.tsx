import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/status-dot";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: llmConfig }, { data: recentSessions }] = await Promise.all([
    supabase
      .from("llm_config")
      .select("id, provider, model")
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const username = user?.email?.split("@")[0] ?? "创作者";

  return (
    <div className="mx-auto max-w-[1080px] px-8 py-10">
      <section className="animate-fade-up">
        <h1 className="text-[28px] font-medium tracking-tight">
          欢迎回来，{username}
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          让 AI 从世界观、人物、叙事三个维度解构你的小说，并基于结果生成变体作品。
        </p>
      </section>

      <section className="mt-6 animate-fade-up [animation-delay:60ms]">
        {!llmConfig ? (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span className="text-muted-foreground">尚未配置 LLM</span>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href="/settings"
              className="inline-flex items-center text-foreground transition-colors hover:text-primary"
            >
              配置
              <ArrowRight className="ml-0.5 h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-muted-foreground">
              已配置{" "}
              <span className="font-mono text-foreground tabular-nums">
                {llmConfig.model}
              </span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href="/settings"
              className="inline-flex items-center text-foreground transition-colors hover:text-primary"
            >
              管理
              <ArrowRight className="ml-0.5 h-3 w-3" />
            </Link>
          </div>
        )}
      </section>

      <section className="mt-8 animate-fade-up [animation-delay:120ms]">
        <Button asChild>
          <Link href="/upload">
            <Plus />
            上传小说
          </Link>
        </Button>
      </section>

      <div className="mt-12 mb-6 h-px bg-border/60" />

      <section className="animate-fade-up [animation-delay:180ms]">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-foreground">最近会话</h2>
          {recentSessions && recentSessions.length > 0 ? (
            <Link
              href="/sessions"
              className="flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              查看全部
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        <div className="mt-3">
          {recentSessions && recentSessions.length > 0 ? (
            <ul className="divide-y divide-border/40">
              {recentSessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/sessions/${s.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40"
                  >
                    <StatusDot status={s.status} />
                    <span className="flex-1 truncate text-[13px] text-foreground">
                      {s.name}
                    </span>
                    <span className="text-[12px] text-muted-foreground tabular-nums">
                      {formatRelativeTime(s.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center">
              <p className="text-[13px] text-muted-foreground">
                还没有分析记录
              </p>
              <Link
                href="/upload"
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary transition-colors hover:text-primary/80"
              >
                上传一部小说开启第一次 AI 解构
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
