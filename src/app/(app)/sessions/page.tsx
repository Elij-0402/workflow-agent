import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { getSessionStatusMeta, StatusDot } from "@/components/status-dot";

export default async function SessionsPage() {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, status, created_at, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-4 py-8 sm:px-6 md:px-8 md:py-10">
      <div className="max-w-2xl space-y-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          会话历史
        </p>
        <h1 className="text-[26px] font-medium tracking-tight sm:text-[30px]">
          所有分析工作流
        </h1>
        <p className="text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
          每次上传、分析与生成都会保存为一条会话，方便你回到最近的工作上下文。
        </p>
      </div>

      {sessions && sessions.length > 0 ? (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/70 bg-card/30">
          {sessions.map((session) => {
            const status = getSessionStatusMeta(session.status);

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
                        <span>创建于 {formatDate(session.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[12px] text-muted-foreground">
                      {formatRelativeTime(session.updated_at)}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-foreground">
                      打开
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
            <h2 className="text-[15px] font-medium text-foreground">还没有会话</h2>
            <p className="text-[13px] leading-6 text-muted-foreground">
              上传第一部小说后，这里会出现完整的分析工作流列表。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
