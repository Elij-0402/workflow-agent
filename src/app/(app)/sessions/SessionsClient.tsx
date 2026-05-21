"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

type SelectIntent = null | "manage" | "compare";

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
};

type ConfirmState = null | {
  kind: "single-delete" | "single-archive" | "single-restore" | "bulk";
  ids: string[];
  action: "archive" | "restore" | "delete";
};

export function SessionsClient({ sessions, view }: SessionsClientProps) {
  const router = useRouter();
  const [intent, setIntent] = useState<SelectIntent>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  const selectMode = intent !== null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIntent(null);
  };

  const goCompare = () => {
    if (selectedIds.size === 0) {
      toast.error("请先勾选要比较的项目。");
      return;
    }
    const ids = Array.from(selectedIds).slice(0, COMPARE_MAX);
    router.push(`/compare?sessionIds=${ids.join(",")}`);
  };

  const runSingle = async (id: string, action: "archive" | "restore" | "delete") => {
    let res: Response;
    if (action === "delete") {
      const hard = view === "archived" ? "?hard=true" : "";
      res = await fetch(`/api/sessions/${id}${hard}`, { method: "DELETE" });
    } else if (action === "archive") {
      res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    } else {
      res = await fetch(`/api/sessions/${id}`, { method: "PATCH" });
    }
    return res;
  };

  const runBulk = async (action: "archive" | "restore" | "delete", ids: string[]) => {
    return fetch("/api/sessions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
  };

  const handleConfirm = () => {
    if (!confirm) return;
    startTransition(async () => {
      const isBulk = confirm.kind === "bulk";
      const res = isBulk
        ? await runBulk(confirm.action, confirm.ids)
        : await runSingle(confirm.ids[0], confirm.action);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "操作失败。");
        return;
      }
      toast.success(
        confirm.action === "delete"
          ? `已删除 ${confirm.ids.length} 项`
          : confirm.action === "archive"
            ? `已归档 ${confirm.ids.length} 项`
            : `已恢复 ${confirm.ids.length} 项`,
      );
      setConfirm(null);
      clearSelection();
      router.refresh();
    });
  };

  const selectedCount = selectedIds.size;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
        <span>
          {view === "archived"
            ? `// archived · ${sessions.length} projects`
            : `// archive · ${sessions.length} projects`}
        </span>
        <div className="flex items-center gap-2">
          {intent === "manage" ? (
            <>
              <span className="text-muted-foreground/80">已选 {selectedCount}</span>
              {view === "active" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={selectedCount === 0 || pending}
                  onClick={() =>
                    setConfirm({
                      kind: "bulk",
                      action: "archive",
                      ids: Array.from(selectedIds),
                    })
                  }
                >
                  批量归档
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={selectedCount === 0 || pending}
                  onClick={() =>
                    setConfirm({
                      kind: "bulk",
                      action: "restore",
                      ids: Array.from(selectedIds),
                    })
                  }
                >
                  批量恢复
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={selectedCount === 0 || pending}
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  setConfirm({
                    kind: "bulk",
                    action: "delete",
                    ids: Array.from(selectedIds),
                  })
                }
              >
                批量删除
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={clearSelection}>
                取消选择
              </Button>
            </>
          ) : intent === "compare" ? (
            <>
              <span className="text-muted-foreground/80">
                已选 {selectedCount} / {COMPARE_MAX}
              </span>
              <Button type="button" size="sm" disabled={selectedCount === 0} onClick={goCompare}>
                对比已选
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={clearSelection}>
                取消
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => setIntent("manage")}>
                选择
              </Button>
              {view === "active" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIntent("compare")}
                >
                  进入比较模式
                </Button>
              ) : null}
            </>
          )}
        </div>
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
            selectMode={selectMode}
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
