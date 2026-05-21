"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type DismissibleTipProps = {
  storageKey: string;
  children: React.ReactNode;
  className?: string;
};

export function DismissibleTip({
  storageKey,
  children,
  className,
}: DismissibleTipProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`tip:${storageKey}`);
      setDismissed(v === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "surface-subtle relative flex items-start gap-3 px-4 py-3 text-[13px] leading-6 text-muted-foreground",
        className,
      )}
    >
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(`tip:${storageKey}`, "1");
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
        className="shrink-0 rounded-[2px] p-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
        aria-label="不再提示"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
