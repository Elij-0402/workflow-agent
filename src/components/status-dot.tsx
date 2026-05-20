import { cn } from "@/lib/utils";

export const SESSION_STATUS_META: Record<
  string,
  { dot: string; label: string; tone: string; glyph: string }
> = {
  draft: {
    dot: "text-muted-foreground",
    label: "// draft",
    tone: "text-muted-foreground",
    glyph: "○",
  },
  uploaded: {
    dot: "text-flash",
    label: "// uploaded",
    tone: "text-flash",
    glyph: "●",
  },
  analyzing: {
    dot: "text-primary",
    label: "// running",
    tone: "text-primary",
    glyph: "◐",
  },
  generating: {
    dot: "text-primary",
    label: "// generating",
    tone: "text-primary",
    glyph: "◐",
  },
  analyzed: {
    dot: "text-flash",
    label: "// analyzed",
    tone: "text-flash",
    glyph: "●",
  },
  done: {
    dot: "text-flash",
    label: "// done",
    tone: "text-flash",
    glyph: "✓",
  },
};

export function getSessionStatusMeta(status: string) {
  return (
    SESSION_STATUS_META[status] ?? {
      dot: "text-muted-foreground",
      label: `// ${status}`,
      tone: "text-muted-foreground",
      glyph: "○",
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
  const pulsing = status === "analyzing" || status === "generating";

  return (
    <span
      className={cn(
        "inline-flex h-3 w-3 shrink-0 items-center justify-center font-mono text-[11px] leading-none",
        meta.dot,
        pulsing && "animate-pulse",
        className
      )}
      aria-hidden="true"
    >
      {meta.glyph}
    </span>
  );
}
