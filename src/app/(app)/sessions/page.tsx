import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
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
    <div className="app-page">
      <PageHeader
        label="Sessions"
        title="任务记录"
        description="所有导入、分析和生成结果都会保留在这里。"
      />

      {sessions && sessions.length > 0 ? (
        <ul className="overflow-hidden rounded-[8px] border border-border/70 bg-card/60">
          {sessions.map((session) => {
            const status = getSessionStatusMeta(session.status);

            return (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="flex min-w-0 items-center gap-3 border-t border-border/70 px-5 py-4 transition-colors first:border-t-0 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
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
        <div className="rounded-[8px] border border-dashed border-border/70 px-5 py-10">
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
