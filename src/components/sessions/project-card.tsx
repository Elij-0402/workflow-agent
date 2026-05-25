"use client";

import Link from "next/link";
import { ArrowRight, MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";

type ProjectSession = {
  id: string;
  name: string;
  status: string;
  mode: "single" | "dual" | string;
  modeLabel: string;
  modeTone: "primary" | "muted";
  stageLabel: string;
  nextActionLabel: string;
  nextHref: string;
  progressLabel: string;
  lastActivityLabel: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
};

type ProjectCardProps = {
  session: ProjectSession;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (id: string, checked: boolean) => void;
};

export function ProjectCard({
  session,
  onArchive,
  onRestore,
  onDelete,
  selectable = false,
  selected = false,
  onSelectChange,
}: ProjectCardProps) {
  const href = session.nextHref || `/sessions/${session.id}`;
  const isDual = session.mode === "dual";

  return (
    <div
      className={cn(
        "surface-panel group relative flex h-full flex-col p-5 transition-colors hover:border-primary/60 focus-within:border-primary/60",
        isDual && "border-primary/25 bg-primary/5",
      )}
    >
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-[3px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label={`打开 ${session.name}`}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={cn(
              "type-mono-label",
              session.modeTone === "primary"
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            {session.modeLabel}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {selectable ? (
            <input
              type="checkbox"
              checked={selected}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) =>
                onSelectChange?.(session.id, event.target.checked)
              }
              className="relative z-20 h-4 w-4 rounded border-border"
              aria-label={`选择 ${session.name}`}
            />
          ) : null}
          <CardActions
            isArchived={Boolean(session.archived_at)}
            onArchive={onArchive ? () => onArchive(session.id) : undefined}
            onRestore={onRestore ? () => onRestore(session.id) : undefined}
            onDelete={onDelete ? () => onDelete(session.id) : undefined}
          />
        </div>
      </div>

      <h3 className="type-title relative z-10 mt-3 line-clamp-2 leading-tight">
        {session.name}
      </h3>

      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2">
        <StagePill label={session.stageLabel} />
        <span className="type-caption leading-6">{session.progressLabel}</span>
      </div>

      <p className="relative z-10 mt-4 line-clamp-2">
        <span className="type-caption">下一步 </span>
        <span className="type-body font-medium">{session.nextActionLabel}</span>
        <span className="type-caption"> · {session.lastActivityLabel}</span>
      </p>

      <div className="relative z-10 mt-auto flex items-end justify-between gap-3 border-t border-border/60 pt-5">
        <div className="type-caption space-y-1">
          <div>最近更新 · {formatRelativeTime(session.updated_at)}</div>
          <div className="text-muted-foreground/70">
            创建于 · {formatDate(session.created_at)}
          </div>
        </div>
        <span className="type-caption inline-flex items-center gap-1 transition-colors group-hover:text-foreground">
          进入
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </div>
  );
}

function stagePillClasses(label: string): string {
  if (label === "待确认蓝图") {
    return "border-locked/40 bg-locked/10 text-locked";
  }
  if (label === "可生成" || label === "已完成首轮") {
    return "border-flash/40 bg-flash/10 text-flash";
  }
  if (label === "进行中" || label === "待补素材") {
    return "border-info/40 bg-info/10 text-info";
  }
  return "border-border bg-muted text-muted-foreground";
}

function StagePill({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 type-caption",
        stagePillClasses(label),
      )}
    >
      {label}
    </span>
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
