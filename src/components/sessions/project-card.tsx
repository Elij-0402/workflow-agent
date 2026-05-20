import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { getSessionStatusMeta, StatusDot } from "@/components/status-dot";

type ProjectSession = {
  id: string;
  name: string;
  status: string;
  mode: "single" | "dual" | string;
  created_at: string;
  updated_at: string;
};

export function ProjectCard({ session }: { session: ProjectSession }) {
  const status = getSessionStatusMeta(session.status);
  const href =
    session.mode === "dual"
      ? `/sessions/${session.id}/workbench`
      : `/sessions/${session.id}`;
  const isDual = session.mode === "dual";

  return (
    <Link
      href={href}
      className="surface-panel group flex h-full flex-col p-5 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-4">
        <BookSpineVisual isDual={isDual} />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground/60">
          {isDual ? "// 双书" : "// 单书"}
        </span>
      </div>

      <h3 className="mt-5 line-clamp-2 font-display italic text-[20px] leading-tight text-foreground">
        {session.name}
      </h3>

      <div className="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em]">
        <StatusDot status={session.status} />
        <span className={status.tone}>{status.label}</span>
      </div>

      <div className="mt-auto pt-5 flex items-end justify-between gap-3 border-t border-dashed border-border/60">
        <div className="space-y-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
          <div>updated · {formatRelativeTime(session.updated_at)}</div>
          <div className="text-muted-foreground/60">
            created · {formatDate(session.created_at)}
          </div>
        </div>
        <div className="inline-flex items-center gap-1 text-[12px] text-primary opacity-60 transition-opacity group-hover:opacity-100">
          打开
          <ArrowRight aria-hidden className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

function BookSpineVisual({ isDual }: { isDual: boolean }) {
  return (
    <div className="flex items-end gap-1" aria-hidden>
      <Spine />
      <Spine className={cn(!isDual && "opacity-25")} />
    </div>
  );
}

function Spine({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block h-16 w-2 rounded-[1px] bg-primary/70 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]",
        className
      )}
    />
  );
}
