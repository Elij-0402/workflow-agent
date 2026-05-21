"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type ProgressNoteProps = {
  active: boolean;
  label?: string;
  estimateSeconds?: number;
  progress?: { done: number; total: number };
};

export function ProgressNote({
  active,
  label = "处理中",
  estimateSeconds,
  progress,
}: ProgressNoteProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div className="inline-flex items-center gap-2 text-[12px] text-primary">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      <span>{label}</span>
      {progress ? (
        <span className="text-muted-foreground">
          · {progress.done}/{progress.total}
        </span>
      ) : null}
      {estimateSeconds ? (
        <span className="text-muted-foreground">· 预计 {estimateSeconds}s</span>
      ) : null}
      <span className="text-muted-foreground">· 已用 {elapsed}s</span>
    </div>
  );
}
