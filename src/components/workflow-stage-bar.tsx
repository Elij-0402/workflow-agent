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
};

export function WorkflowStageBar({ items }: WorkflowStageBarProps) {
  return (
    <ol className="grid gap-3 md:grid-cols-3" aria-label="任务进度">
      {items.map((item, index) => {
        const isDone = item.state === "done";
        const isCurrent = item.state === "current";

        return (
          <li
            key={item.key}
            className={cn(
              "relative rounded-lg border px-4 py-4",
              isCurrent
                ? "border-primary/50 bg-primary/10"
                : "border-border/60 bg-background/20"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-medium",
                  isDone
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : isCurrent
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border/70 text-muted-foreground"
                )}
                aria-hidden="true"
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>

              <div className="min-w-0 space-y-1">
                <div className="text-[14px] font-medium text-foreground">
                  {item.label}
                </div>
                <p className="text-[13px] leading-5 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
