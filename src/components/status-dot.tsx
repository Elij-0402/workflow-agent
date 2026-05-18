import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-zinc-500",
  uploaded: "bg-blue-400",
  analyzing: "bg-amber-400 animate-pulse",
  generating: "bg-amber-400 animate-pulse",
  analyzed: "bg-emerald-400",
  done: "bg-emerald-400",
};

export function StatusDot({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        STATUS_COLOR[status] ?? "bg-zinc-500",
        className
      )}
      aria-label={status}
    />
  );
}
