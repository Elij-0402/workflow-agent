import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type WorkflowStageState = "done" | "current" | "upcoming";

export type WorkflowStageItem = {
  key: string;
  label: string;
  description: string;
  state: WorkflowStageState;
};

type WorkflowStageBarProps = {
  items: WorkflowStageItem[];
  activeKey?: string;
  disabledKeys?: string[];
  onSelect?: (key: string) => void;
};

export function WorkflowStageBar({
  items,
  activeKey,
  disabledKeys = [],
  onSelect,
}: WorkflowStageBarProps) {
  return (
    <div className="surface-panel">
      <ol
        className="flex flex-col divide-y divide-dashed divide-border/60 lg:flex-row lg:divide-x lg:divide-y-0"
        aria-label="任务进度"
      >
        {items.map((item, index) => {
          const isDone = item.state === "done";
          const isCurrent = activeKey
            ? activeKey === item.key
            : item.state === "current";
          const isDisabled = disabledKeys.includes(item.key);
          const glyph = isDone ? "✓" : isCurrent ? "▷" : "·";
          const stepNo = String(index + 1).padStart(2, "0");

          return (
            <li
              key={item.key}
              className={cn(
                "relative flex-1 px-5 py-4 transition-colors",
                isCurrent && "bg-primary/5",
              )}
            >
              <button
                type="button"
                onClick={() => !isDisabled && onSelect?.(item.key)}
                disabled={isDisabled || !onSelect}
                className="flex w-full items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-7 shrink-0 items-center justify-center font-mono text-[11px] tracking-[0.06em]",
                    isDone
                      ? "text-flash"
                      : isCurrent
                        ? "text-primary"
                        : "text-muted-foreground/60",
                  )}
                  aria-hidden="true"
                >
                  {stepNo}
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-mono text-[12px]",
                        isDone
                          ? "text-flash"
                          : isCurrent
                            ? "text-primary"
                            : "text-muted-foreground/50",
                      )}
                      aria-hidden="true"
                    >
                      {glyph}
                    </span>
                    <span
                      className={cn(
                        "text-[13px]",
                        isCurrent
                          ? "font-display italic text-foreground"
                          : "text-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[12px] leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
