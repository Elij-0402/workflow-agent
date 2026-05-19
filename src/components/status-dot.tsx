import { cn } from "@/lib/utils";

export const SESSION_STATUS_META: Record<
  string,
  { dot: string; label: string; tone: string }
> = {
  draft: { dot: "bg-zinc-500", label: "草稿", tone: "text-zinc-300" },
  uploaded: { dot: "bg-sky-400", label: "已导入", tone: "text-sky-300" },
  analyzing: {
    dot: "bg-amber-400 animate-pulse",
    label: "分析中",
    tone: "text-amber-300",
  },
  generating: {
    dot: "bg-amber-400 animate-pulse",
    label: "生成中",
    tone: "text-amber-300",
  },
  analyzed: {
    dot: "bg-emerald-400",
    label: "已分析",
    tone: "text-emerald-300",
  },
  done: { dot: "bg-emerald-400", label: "已完成", tone: "text-emerald-300" },
};

export function getSessionStatusMeta(status: string) {
  return (
    SESSION_STATUS_META[status] ?? {
      dot: "bg-zinc-500",
      label: status,
      tone: "text-zinc-300",
    }
  );
}

export function StatusDot({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = getSessionStatusMeta(status);

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_2px_hsl(var(--background))]",
        meta.dot,
        className
      )}
      aria-hidden="true"
    />
  );
}
