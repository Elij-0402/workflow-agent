"use client";

import Link from "next/link";
import { ArrowRight, Check, MoreVertical } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { getSessionStatusMeta, StatusDot } from "@/components/status-dot";

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
  selectMode?: boolean;
  selected?: boolean;
  onToggle?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function ProjectCard({
  session,
  selectMode = false,
  selected = false,
  onToggle,
  onArchive,
  onRestore,
  onDelete,
}: ProjectCardProps) {
  const status = getSessionStatusMeta(session.status);
  const href =
    session.mode === "dual" ? `/sessions/${session.id}/workbench` : `/sessions/${session.id}`;
  const isDual = session.mode === "dual";
  const isArchived = Boolean(session.archived_at);

  return (
    <div
      className={cn(
        "surface-panel group relative flex h-full flex-col p-5 transition-colors",
        selected
          ? "border-primary"
          : "hover:border-primary/60 focus-within:border-primary/60",
      )}
    >
      <Link
        href={href}
        className="absolute inset-0 z-0 rounded-[3px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label={`打开 ${session.name}`}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <BookSpineVisual isDual={isDual} />
        <div className="flex items-center gap-1">
          {selectMode && onToggle ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle(session.id);
              }}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-[2px] border transition-colors",
                selected
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background/80 text-transparent hover:border-primary/60 hover:text-primary/60",
              )}
              aria-pressed={selected}
              aria-label={selected ? "取消选择" : "选择此项目用于对比"}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          ) : null}
          <CardActions
            isArchived={isArchived}
            onArchive={onArchive ? () => onArchive(session.id) : undefined}
            onRestore={onRestore ? () => onRestore(session.id) : undefined}
            onDelete={onDelete ? () => onDelete(session.id) : undefined}
          />
        </div>
      </div>

      <h3 className="relative z-10 mt-5 line-clamp-2 font-display text-[20px] italic leading-tight text-foreground">
        {session.name}
      </h3>

      <div className="relative z-10 mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em]">
        <StatusDot status={session.status} />
        <span className={status.tone}>{status.label}</span>
        <span className="ml-2 text-muted-foreground/60">{isDual ? "双书" : "单书"}</span>
      </div>

      <div className="relative z-10 mt-auto flex items-end justify-between gap-3 border-t border-dashed border-border/60 pt-5">
        <div className="space-y-0.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
          <div>updated · {formatRelativeTime(session.updated_at)}</div>
          <div className="text-muted-foreground/60">created · {formatDate(session.created_at)}</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[12px] text-primary opacity-60 transition-opacity group-hover:opacity-100">
          打开
          <ArrowRight aria-hidden className="h-3 w-3" />
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
          <DropdownMenuItem onSelect={onRestore}>恢复到项目列表</DropdownMenuItem>
        ) : null}
        {!isArchived && onArchive ? (
          <DropdownMenuItem onSelect={onArchive}>归档</DropdownMenuItem>
        ) : null}
        {onDelete ? (
          <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
            {isArchived ? "永久删除" : "删除"}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
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
        className,
      )}
    />
  );
}
