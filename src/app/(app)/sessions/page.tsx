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
    .select("id, name, status, mode, created_at, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div className="app-page">
      <PageHeader
        label="sessions"
        title="任务记录"
        description="所有导入、分析和生成结果都会保留在这里。"
      />

      {sessions && sessions.length > 0 ? (
        <div className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-dashed border-border/70 px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
            <span>{`// archive · ${sessions.length} records`}</span>
            <span className="text-muted-foreground/60">no · status · name</span>
          </div>
          <ul className="divide-y divide-dashed divide-border/40">
            {sessions.map((session, index) => {
              const status = getSessionStatusMeta(session.status);
              const rowNo = String(index + 1).padStart(3, "0");

              return (
                <li key={session.id}>
                  <Link
                    href={
                      session.mode === "dual"
                        ? `/sessions/${session.id}/workbench`
                        : `/sessions/${session.id}`
                    }
                    className="group flex min-w-0 items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-primary/80">
                      {rowNo}
                    </span>
                    <StatusDot status={session.status} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-display italic text-[16px] text-foreground">
                          {session.name}
                        </div>
                        <span className="rounded-[2px] border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          [ {session.mode === "dual" ? "dual" : "single"} ]
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                        <span className={status.tone}>{status.label}</span>
                        <span className="text-muted-foreground/40" aria-hidden>
                          ·
                        </span>
                        <span>created · {formatDate(session.created_at)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                        {formatRelativeTime(session.updated_at)}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.10em] text-primary opacity-60 transition-opacity group-hover:opacity-100">
                        $ open
                        <ArrowRight aria-hidden="true" className="h-3 w-3" />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <pre className="surface-subtle whitespace-pre overflow-x-auto p-7 font-mono text-[12px] leading-6 text-muted-foreground">
{`┌──── sessions · empty ──────────────┐
│                                    │
│   还没有会话                       │
│                                    │
│   上传第一部小说后，               │
│   这里会出现完整的分析工作流列表。 │
│                                    │
│   $ navigate → /upload             │
└────────────────────────────────────┘`}
        </pre>
      )}
    </div>
  );
}
