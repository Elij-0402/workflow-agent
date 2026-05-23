"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  bookLabel: "A" | "B";
  bookTitle: string;
  total: number;
  doneCount: number;
  runningCount: number;
  errorCount: number;
  startedAt: number;
  failures: Array<{ index: number; title: string }>;
  finished: boolean;
  onAbort: () => void;
  onRetryFailed: () => void;
  onDismiss: () => void;
};

export function BatchTracker(props: Props) {
  const { finished, onDismiss } = props;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [finished]);

  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => onDismiss(), 2400);
    return () => clearTimeout(t);
  }, [finished, onDismiss]);

  const queued = Math.max(0, props.total - props.doneCount - props.runningCount - props.errorCount);
  const completedCount = props.doneCount + props.errorCount;
  const pct = props.total > 0 ? Math.min(100, Math.round((completedCount / props.total) * 100)) : 0;

  const elapsedMs = now - props.startedAt;
  const remaining = props.total - completedCount;
  const avgMsPerChapter = completedCount > 0 ? elapsedMs / completedCount : 0;
  const concurrency = 3;
  const etaMs = (avgMsPerChapter * remaining) / Math.max(1, concurrency);
  const etaText = props.finished
    ? "done"
    : avgMsPerChapter > 0 && remaining > 0
      ? formatDuration(etaMs)
      : "--:--";

  const runningWidth = props.total > 0 ? (props.runningCount / props.total) * 100 : 0;

  return (
    <div
      className="surface-panel relative overflow-hidden px-4 py-3"
      style={{
        opacity: props.finished ? 0.78 : 1,
        transition: "opacity var(--duration-base) var(--easing-out)",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="eyebrow-label">
          batch · book {props.bookLabel} · {props.bookTitle}
        </div>
        {!props.finished ? (
          <button
            type="button"
            onClick={props.onAbort}
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-destructive"
            style={{ transitionDuration: "var(--duration-fast)" }}
            aria-label="中止批量分析"
          >
            × abort
          </button>
        ) : null}
      </div>

      <div className="mt-2 font-mono text-[11.5px] tracking-[0.06em] text-muted-foreground">
        chapter analysis · <span className="text-flash">{props.doneCount}</span>
        {" / "}
        <span className="text-foreground">{props.total}</span> done ·{" "}
        <span className="text-primary">{props.runningCount}</span> running · <span>{queued}</span>{" "}
        queued
        {props.errorCount > 0 ? (
          <>
            {" · "}
            <span className="text-destructive">{props.errorCount}</span> failed
          </>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div
          className="relative h-1.5 flex-1 overflow-hidden rounded-[1px] bg-muted/50"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div
            className="absolute inset-y-0 left-0 bg-primary"
            style={{
              width: `${pct}%`,
              transition: "width var(--duration-base) var(--easing-out)",
            }}
          />
          {props.runningCount > 0 ? (
            <div
              className="absolute inset-y-0 bg-primary/30"
              style={{
                left: `${pct}%`,
                width: `${runningWidth}%`,
                transition: "left var(--duration-base) var(--easing-out)",
              }}
            />
          ) : null}
        </div>
        <div className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-muted-foreground">
          {pct}% · ETA ~ {etaText}
        </div>
      </div>

      {props.failures.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border/50 pt-2">
          <div className="font-mono text-[11px] tracking-[0.06em] text-destructive/85">
            failures:{" "}
            {props.failures
              .slice(0, 6)
              .map((f) => `ch${String(f.index).padStart(2, "0")}`)
              .join(", ")}
            {props.failures.length > 6 ? `, +${props.failures.length - 6}` : ""}
          </div>
          {props.finished ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onRetryFailed}
              className="font-mono text-[11px] uppercase tracking-[0.10em] text-primary hover:text-primary"
            >
              $ retry failed
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
