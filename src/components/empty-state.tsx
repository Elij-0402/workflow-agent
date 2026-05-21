import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "surface-panel flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <Icon
          className="h-10 w-10 text-primary/60"
          strokeWidth={1.5}
          aria-hidden
        />
      ) : null}
      <h3 className="text-[18px] font-medium leading-tight text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="max-w-md text-[13px] leading-7 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
