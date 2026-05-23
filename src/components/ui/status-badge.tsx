import { cn } from "@/lib/utils";

type Tone = "neutral" | "running" | "success" | "warning" | "destructive";

const TONE_CLASS: Record<Tone, { border: string; text: string; dot: string }> = {
  neutral: {
    border: "border-border/60",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/70",
  },
  running: {
    border: "border-primary/45",
    text: "text-primary",
    dot: "bg-primary",
  },
  success: {
    border: "border-flash/45",
    text: "text-flash",
    dot: "bg-flash",
  },
  warning: {
    border: "border-brass-soft/55",
    text: "text-brass-soft",
    dot: "bg-brass-soft",
  },
  destructive: {
    border: "border-destructive/50",
    text: "text-destructive",
    dot: "bg-destructive",
  },
};

type StatusBadgeProps = {
  label: string;
  tone?: Tone;
  pulse?: boolean;
  srLabel?: string;
  className?: string;
};

export function StatusBadge({
  label,
  tone = "neutral",
  pulse = false,
  srLabel,
  className,
}: StatusBadgeProps) {
  const c = TONE_CLASS[tone];
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-xs border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.10em]",
        c.border,
        c.text,
        className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", c.dot, pulse && "animate-pulse")}
        aria-hidden
      />
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
      {label}
    </span>
  );
}

const SESSION_TONE: Record<string, Tone> = {
  draft: "neutral",
  uploaded: "success",
  analyzing: "running",
  generating: "running",
  analyzed: "success",
  done: "success",
};

const SESSION_LABEL_ZH: Record<string, string> = {
  draft: "草稿",
  uploaded: "已上传",
  analyzing: "分析中",
  generating: "生成中",
  analyzed: "已分析",
  done: "已完成",
};

export function SessionStatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = SESSION_TONE[status] ?? "neutral";
  const label = SESSION_LABEL_ZH[status] ?? status;
  const pulse = status === "analyzing" || status === "generating";
  return <StatusBadge label={label} tone={tone} pulse={pulse} className={className} />;
}

const BRIEF_TONE: Record<string, Tone> = {
  draft: "neutral",
  active: "success",
  archived: "neutral",
};

const BRIEF_LABEL_ZH: Record<string, string> = {
  draft: "草稿",
  active: "启用中",
  archived: "已归档",
};

export function BriefStatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = BRIEF_TONE[status] ?? "neutral";
  const label = BRIEF_LABEL_ZH[status] ?? status;
  return <StatusBadge label={label} tone={tone} className={className} />;
}

type BlueprintStatus = "draft" | "confirmed" | string;

export function BlueprintStatusBadge({
  status,
  className,
}: {
  status: BlueprintStatus;
  className?: string;
}) {
  const tone: Tone = status === "confirmed" ? "success" : "neutral";
  const label = status === "confirmed" ? "已确认" : "草稿";
  return <StatusBadge label={label} tone={tone} className={className} />;
}

type ChapterStatus = "idle" | "running" | "done" | "error" | string;

export function ChapterStatusBadge({
  status,
  className,
}: {
  status: ChapterStatus;
  className?: string;
}) {
  const tone: Tone =
    status === "done"
      ? "success"
      : status === "running"
        ? "running"
        : status === "error"
          ? "destructive"
          : "neutral";
  const label =
    status === "done"
      ? "已完成"
      : status === "running"
        ? "进行中"
        : status === "error"
          ? "失败"
          : "未开始";
  const pulse = status === "running";
  return <StatusBadge label={label} tone={tone} pulse={pulse} className={className} />;
}
