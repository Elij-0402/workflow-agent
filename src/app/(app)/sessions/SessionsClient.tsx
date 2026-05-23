"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Clock3 } from "lucide-react";
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
import type { SessionDashboardItem } from "@/lib/sessions/dashboard";
import { groupSessionsByMode } from "@/lib/sessions/group";
import { cn } from "@/lib/utils";

type SessionsClientProps = {
  sessions: SessionDashboardItem[];
  view: "active" | "archived";
  recentEvents?: Array<{ id: string; label: string; detail: string }>;
};

type ConfirmState = null | {
  kind: "single-delete" | "single-archive" | "single-restore";
  ids: string[];
  action: "archive" | "restore" | "delete";
};

export function SessionsClient({
  sessions,
  view,
  recentEvents = [],
}: SessionsClientProps) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();
  const grouped = groupSessionsByMode(sessions);

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

  return (
    <>
      <div className={cn("grid gap-4 xl:grid-cols-[1.55fr_.85fr]", pending && "pointer-events-none opacity-60")}>
        <div className="space-y-8">
          {view === "active" ? (
            <>
              <SessionSection
                title="双书项目"
                description="优先处理双书项目。这里会给出当前阶段、下一步动作和最近状态。"
                sessions={grouped.dual}
                view={view}
                onAction={setConfirm}
              />
              <SessionSection
                title="单书兼容"
                description="保留原有单书分析和生成路径，适合继续推进历史项目。"
                sessions={grouped.single}
                view={view}
                onAction={setConfirm}
                subdued
              />
            </>
          ) : (
            <SessionGrid sessions={sessions} view={view} onAction={setConfirm} />
          )}
        </div>

        <aside className="space-y-4">
          <div className="surface-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow-label">动态</p>
                <h2 className="mt-2 text-[18px] font-semibold text-foreground">
                  最近项目动作
                </h2>
              </div>
              <Clock3 className="h-4 w-4 text-primary" aria-hidden />
            </div>
            <div className="mt-5 space-y-3">
              {recentEvents.length > 0 ? (
                recentEvents.map((event) => (
                  <div key={event.id} className="surface-subtle px-4 py-3">
                    <p className="text-[13px] text-foreground">{event.label}</p>
                    <p className="mt-1 text-[12px] leading-6 text-muted-foreground">
                      {event.detail}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[13px] leading-6 text-muted-foreground">
                  还没有最近动作。创建项目后，这里会显示蓝图确认、生成完成和简报状态。
                </p>
              )}
            </div>
          </div>

          <div className="surface-panel p-5">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" aria-hidden />
              <h2 className="text-[16px] font-semibold text-foreground">
                本页规则
              </h2>
            </div>
            <ul className="mt-4 space-y-3 text-[13px] leading-6 text-muted-foreground">
              <li>优先处理“待确认蓝图”和“可生成”的项目。</li>
              <li>项目卡直接给出下一步，不再让你自己猜流程。</li>
              <li>归档项目统一移到资料库，不占主列表注意力。</li>
            </ul>
            <Button asChild variant="outline" className="mt-4 w-full">
              <a href="/library">打开资料库</a>
            </Button>
          </div>
        </aside>
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
  subdued = false,
}: {
  title: string;
  description: string;
  sessions: SessionDashboardItem[];
  view: "active" | "archived";
  onAction: (state: ConfirmState) => void;
  subdued?: boolean;
}) {
  if (sessions.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <p className={cn("eyebrow-label", subdued && "text-muted-foreground/80")}>
          {subdued ? "兼容流程" : "主路线"}
        </p>
        <h2 className="text-[18px] font-semibold leading-tight text-foreground">
          {title}
        </h2>
        <p className="max-w-3xl text-[13px] leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <SessionGrid sessions={sessions} view={view} onAction={onAction} />
    </section>
  );
}

function SessionGrid({
  sessions,
  view,
  onAction,
}: {
  sessions: SessionDashboardItem[];
  view: "active" | "archived";
  onAction: (state: ConfirmState) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sessions.map((session) => (
        <ProjectCard
          key={session.id}
          session={session}
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
