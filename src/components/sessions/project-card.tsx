"use client";

import Link from "next/link";
import { MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SessionStatusBadge } from "@/components/ui/status-badge";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

type ProjectSession = {
  id: string;
  name: string;
  status: string;
  mode: "single" | "dual" | string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
};

type ProjectCardProps = {
  session: ProjectSession;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function ProjectCard({
  session,
  onArchive,
  onRestore,
  onDelete,
}: ProjectCardProps) {
  const href = `/sessions/${session.id}`;
  const isDual = session.mode === "dual";
  const isArchived = Boolean(session.archived_at);

  return (
    <div
      className={cn(
        "surface-panel group relative flex h-full flex-col p-5 transition-colors hover:border-primary/60 focus-within:border-primary/60",
      )}
    >
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-[3px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label={`打开 ${session.name}`}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mono-label-sm">
            {isDual ? "双书任务" : "单书兼容任务"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <CardActions
            isArchived={isArchived}
            onArchive={onArchive ? () => onArchive(session.id) : undefined}
            onRestore={onRestore ? () => onRestore(session.id) : undefined}
            onDelete={onDelete ? () => onDelete(session.id) : undefined}
          />
        </div>
      </div>

      <h3 className="relative z-10 mt-3 line-clamp-2 text-[18px] font-semibold leading-tight text-foreground">
        {session.name}
      </h3>

      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2">
        <SessionStatusBadge status={session.status} />
        <span className="text-[12px] text-muted-foreground">
          {isDual ? "上传 → 分析 → 对比 → 生成" : "兼容旧流程"}
        </span>
      </div>

      <div className="relative z-10 mt-auto flex items-end justify-between gap-3 border-t border-border/60 pt-5">
        <div className="space-y-0.5 text-[12px] text-muted-foreground">
          <div>updated · {formatRelativeTime(session.updated_at)}</div>
          <div className="text-muted-foreground/70">
            created · {formatDate(session.created_at)}
          </div>
        </div>
        <span className="text-[12px] text-muted-foreground transition-colors group-hover:text-foreground">
          查看
        </span>
      </div>
    </div>
  );
}

function CardActions({
  isArchived,
  onArchive,
  onRestore,
  onDelete,
}: {
  isArchived: boolean;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
}) {
  if (!onArchive && !onRestore && !onDelete) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="inline-flex h-6 w-6 items-center justify-center rounded-[2px] text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
          aria-label="更多操作"
        >
          <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.6} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {isArchived && onRestore ? (
          <DropdownMenuItem onSelect={onRestore}>
            恢复到任务列表
          </DropdownMenuItem>
        ) : null}
        {!isArchived && onArchive ? (
          <DropdownMenuItem onSelect={onArchive}>归档</DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem
            onSelect={onDelete}
            className="text-destructive focus:text-destructive"
          >
            {isArchived ? "永久删除" : "删除"}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
