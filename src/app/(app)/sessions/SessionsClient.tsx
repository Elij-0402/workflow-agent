"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { GitCompare, X } from "lucide-react";
import { toast } from "sonner";

import { ProjectCard } from "@/components/sessions/project-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const COMPARE_MAX = 6;

type SessionRow = {
  id: string;
  name: string;
  status: string;
  mode: "single" | "dual" | string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type SessionsClientProps = {
  sessions: SessionRow[];
  view: "active" | "archived";
  initialWith?: string | null;
};

type ConfirmState = null | {
  kind: "single-delete" | "single-archive" | "single-restore";
  ids: string[];
  action: "archive" | "restore" | "delete";
};

export function SessionsClient({ sessions, view, initialWith = null }: SessionsClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (initialWith && sessions.some((s) => s.id === initialWith)) initial.add(initialWith);
    return initial;
  });
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  // If initialWith arrives via prop change (e.g. SSR re-render), seed selection once.
  useEffect(() => {
    if (initialWith && sessions.some((s) => s.id === initialWith)) {
      setSelectedIds((prev) => {
        if (prev.has(initialWith)) return prev;
        const next = new Set(prev);
        next.add(initialWith);
        return next;
      });
    }
  }, [initialWith, sessions]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const goCompare = () => {
    if (selectedIds.size < 2) {
      toast.error("请至少选择 2 个项目。");
      return;
    }
    const ids = Array.from(selectedIds).slice(0, COMPARE_MAX);
    router.push(`/compare?sessionIds=${ids.join(",")}`);
  };

  const runSingle = async (id: string, action: "archive" | "restore" | "delete") => {
    if (action === "delete") {
      const hard = view === "archived" ? "?hard=true" : "";
      return fetch(`/api/sessions/${id}${hard}`, { method: "DELETE" });
    }
    if (action === "archive") {
      return fetch(`/api/sessions/${id}`, { method: "DELETE" });
    }
    return fetch(`/api/sessions/${id}`, { method: "PATCH" });
  };

  const handleConfirm = () => {
    if (!confirm) return;
    startTransition(async () => {
      const res = await runSingle(confirm.ids[0], confirm.action);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "操作失败。");
        return;
      }
      toast.success(
        confirm.action === "delete"
          ? "已删除"
          : confirm.action === "archive"
            ? "已归档"
            : "已恢复",
      );
      setConfirm(null);
      router.refresh();
    });
  };

  const selectedCount = selectedIds.size;
  const showCompareBar = view === "active" && selectedCount > 0;

  return (
    <>
      <div className="flex items-center gap-1 border-b border-border/60">
        <SegmentLink active={view === "active"} href="/sessions">
          进行中
        </SegmentLink>
        <SegmentLink active={view === "archived"} href="/sessions?view=archived">
          归档
        </SegmentLink>
      </div>

      <div
        className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
          pending && "pointer-events-none opacity-60",
        )}
      >
        {sessions.map((session) => (
          <ProjectCard
            key={session.id}
            session={session}
            selectMode={view === "active"}
            selected={selectedIds.has(session.id)}
            onToggle={toggleSelect}
            onArchive={
              view === "active"
                ? (id) => setConfirm({ kind: "single-archive", action: "archive", ids: [id] })
                : undefined
            }
            onRestore={
              view === "archived"
                ? (id) => setConfirm({ kind: "single-restore", action: "restore", ids: [id] })
                : undefined
            }
            onDelete={(id) => setConfirm({ kind: "single-delete", action: "delete", ids: [id] })}
          />
        ))}
      </div>

      {showCompareBar ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
            <span className="text-[13px] text-muted-foreground">
              已选 {selectedCount} / {COMPARE_MAX}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={goCompare}
              disabled={selectedCount < 2}
            >
              <GitCompare className="h-4 w-4" />
              对比
            </Button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="清空选择"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        confirm={confirm}
        pending={pending}
        view={view}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

function SegmentLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      data-active={active ? "true" : undefined}
      className="terminal-tab"
    >
      {children}
    </a>
  );
}

function ConfirmDialog({
  confirm,
  pending,
  view,
  onCancel,
  onConfirm,
}: {
  confirm: ConfirmState;
  pending: boolean;
  view: "active" | "archived";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = confirm !== null;
  const count = confirm?.ids.length ?? 0;
  const action = confirm?.action;

  let title = "";
  let description = "";
  let confirmLabel = "";
  let destructive = false;

  if (action === "delete") {
    const isHard = view === "archived";
    title = isHard ? "永久删除项目" : "删除项目";
    description = isHard
      ? `永久删除选中的 ${count} 个项目及其全部分析、章节、变体。此操作无法撤销。`
      : `删除选中的 ${count} 个项目（连同其全部分析、章节、变体）。此操作无法撤销。`;
    confirmLabel = isHard ? "永久删除" : "确认删除";
    destructive = true;
  } else if (action === "archive") {
    title = "归档项目";
    description = `归档选中的 ${count} 个项目。归档后可在「归档夹」中找到并恢复。`;
    confirmLabel = "确认归档";
  } else if (action === "restore") {
    title = "恢复项目";
    description = `把选中的 ${count} 个项目恢复到主列表。`;
    confirmLabel = "确认恢复";
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            取消
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "处理中…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
