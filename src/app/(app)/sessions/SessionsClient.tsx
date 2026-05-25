"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { ProjectCard } from "@/components/sessions/project-card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SessionDashboardItem } from "@/lib/sessions/dashboard";
import { groupSessionsByMode } from "@/lib/sessions/group";
import { cn } from "@/lib/utils";

type SessionsClientProps = {
  sessions: SessionDashboardItem[];
  view: "active" | "archived";
  recentEvents?: Array<{ id: string; label: string; detail: string }>;
};

type ConfirmState = null | {
  kind:
    | "single-delete"
    | "single-archive"
    | "single-restore"
    | "bulk-delete"
    | "bulk-archive"
    | "bulk-restore";
  ids: string[];
  action: "archive" | "restore" | "delete";
};

const LIST_HINT =
  "优先处理待确认蓝图与可生成项目；卡片上的「下一步」即推荐动作。";

export function SessionsClient({
  sessions,
  view,
}: SessionsClientProps) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const grouped = groupSessionsByMode(sessions);
  const selectionMode = selectedIds.length > 0;

  const runBulk = async (
    ids: string[],
    action: "archive" | "restore" | "delete",
  ) => {
    if (action === "delete" && view === "archived") {
      const responses = await Promise.all(
        ids.map((id) =>
          fetch(`/api/sessions/${id}?hard=true`, { method: "DELETE" }).catch(
            () => null,
          ),
        ),
      );
      const failed = responses.filter((r) => !r || !r.ok).length;
      if (failed > 0) {
        return {
          ok: false,
          error:
            failed === ids.length
              ? "永久删除失败。"
              : `${ids.length - failed}/${ids.length} 项已删除，其余失败。`,
        };
      }
      return { ok: true };
    }
    const res = await fetch("/api/sessions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    return res.json().catch(() => ({}));
  };

  const runSingle = async (
    id: string,
    action: "archive" | "restore" | "delete",
  ) => {
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
      const isBulk = confirm.ids.length > 1;
      const res = isBulk
        ? await runBulk(confirm.ids, confirm.action)
        : await runSingle(confirm.ids[0], confirm.action).then((response) =>
            response.json().catch(() => ({})),
          );
      if (!res.ok) {
        toast.error(res.error ?? "操作失败。");
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
      setSelectedIds([]);
      router.refresh();
    });
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((item) => item !== id),
    );
  };

  return (
    <>
      <div
        className={cn(
          "w-full space-y-10",
          pending && "pointer-events-none opacity-60",
        )}
      >
        {view === "active" ? (
          <div className="surface-subtle px-4 py-2" role="status">
            <p className="type-caption">{LIST_HINT}</p>
          </div>
        ) : null}

        {selectionMode ? (
          <div className="surface-panel flex flex-wrap items-center gap-3 p-4">
            <p className="type-body">
              已选择 {selectedIds.length} 个项目
            </p>
            {view === "active" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setConfirm({
                    kind: "bulk-archive",
                    action: "archive",
                    ids: selectedIds,
                  })
                }
              >
                批量归档
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setConfirm({
                    kind: "bulk-restore",
                    action: "restore",
                    ids: selectedIds,
                  })
                }
              >
                批量恢复
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() =>
                setConfirm({
                  kind: "bulk-delete",
                  action: "delete",
                  ids: selectedIds,
                })
              }
            >
              {view === "archived" ? "批量永久删除" : "批量删除"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              取消选择
            </Button>
          </div>
        ) : null}

        {view === "active" ? (
          <>
            <SessionSection
              title="双书项目"
              description="优先处理双书项目。这里会给出当前阶段、下一步动作和最近状态。"
              sessions={grouped.dual}
              view={view}
              onAction={setConfirm}
              selectedIds={selectedIds}
              onSelectChange={toggleSelected}
            />
            {grouped.single.length > 0 ? (
              <Collapsible defaultOpen={false}>
                <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40">
                  <ChevronRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
                  />
                  <h2 className="type-title">单书兼容项目</h2>
                  <span className="type-caption text-muted-foreground">
                    {grouped.single.length} 个
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <SessionSection
                    title="单书兼容"
                    description="保留原有单书分析和生成路径，适合继续推进历史项目。"
                    sessions={grouped.single}
                    view={view}
                    onAction={setConfirm}
                    selectedIds={selectedIds}
                    onSelectChange={toggleSelected}
                    subdued
                    hideHeader
                  />
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </>
        ) : (
          <SessionGrid
            sessions={sessions}
            view={view}
            onAction={setConfirm}
            selectedIds={selectedIds}
            onSelectChange={toggleSelected}
          />
        )}
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

function SessionSection({
  title,
  description,
  sessions,
  view,
  onAction,
  selectedIds = [],
  onSelectChange,
  subdued = false,
  hideHeader = false,
}: {
  title: string;
  description: string;
  sessions: SessionDashboardItem[];
  view: "active" | "archived";
  onAction: (state: ConfirmState) => void;
  selectedIds?: string[];
  onSelectChange?: (id: string, checked: boolean) => void;
  subdued?: boolean;
  hideHeader?: boolean;
}) {
  if (sessions.length === 0) return null;

  return (
    <section className="space-y-4">
      {hideHeader ? null : (
        <div className="flex flex-col gap-1.5">
          <p
            className={cn(
              "eyebrow-label",
              subdued && "text-muted-foreground/80",
            )}
          >
            {subdued ? "兼容流程" : "主路线"}
          </p>
          <h2 className="type-title leading-tight">{title}</h2>
          <p className="type-body max-w-3xl text-muted-foreground">
            {description}
          </p>
        </div>
      )}
      <SessionGrid
        sessions={sessions}
        view={view}
        onAction={onAction}
        selectedIds={selectedIds}
        onSelectChange={onSelectChange}
      />
    </section>
  );
}

function SessionGrid({
  sessions,
  view,
  onAction,
  selectedIds = [],
  onSelectChange,
}: {
  sessions: SessionDashboardItem[];
  view: "active" | "archived";
  onAction: (state: ConfirmState) => void;
  selectedIds?: string[];
  onSelectChange?: (id: string, checked: boolean) => void;
}) {
  const selectable = Boolean(onSelectChange);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sessions.map((session) => (
        <ProjectCard
          key={session.id}
          session={session}
          selectable={selectable}
          selected={selectedIds.includes(session.id)}
          onSelectChange={onSelectChange}
          onArchive={
            view === "active"
              ? (id) =>
                  onAction({
                    kind: "single-archive",
                    action: "archive",
                    ids: [id],
                  })
              : undefined
          }
          onRestore={
            view === "archived"
              ? (id) =>
                  onAction({
                    kind: "single-restore",
                    action: "restore",
                    ids: [id],
                  })
              : undefined
          }
          onDelete={(id) =>
            onAction({ kind: "single-delete", action: "delete", ids: [id] })
          }
        />
      ))}
    </div>
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
      ? `永久删除选中的 ${count} 个项目及其全部分析、章节和结果。此操作无法撤销。`
      : `删除选中的 ${count} 个项目（连同其全部分析、章节和结果）。此操作无法撤销。`;
    confirmLabel = isHard ? "永久删除" : "确认删除";
    destructive = true;
  } else if (action === "archive") {
    title = "归档项目";
    description = `归档选中的 ${count} 个项目。归档后可在资料库中找到并恢复。`;
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
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
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
