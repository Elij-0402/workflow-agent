import * as React from "react";

import { cn } from "@/lib/utils";

type Density = "compact" | "default" | "comfortable";

const densityClass: Record<Density, string> = {
  compact: "p-4",
  default: "p-5",
  comfortable: "p-6",
};

type CardShellProps = {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  href?: string;
  selected?: boolean;
  density?: Density;
  className?: string;
  ariaLabel?: string;
  onClickOverlay?: React.MouseEventHandler<HTMLAnchorElement>;
};

/**
 * Generic card frame for ProjectCard / VariantCard / BookCard / ChapterCard / brief card.
 * Eyebrow → title → status → meta → children → footer.
 * `href` adds a full-card click overlay (anchor); inner buttons must stopPropagation.
 */
export function CardShell({
  eyebrow,
  title,
  meta,
  status,
  actions,
  footer,
  children,
  href,
  selected,
  density = "default",
  className,
  ariaLabel,
  onClickOverlay,
}: CardShellProps) {
  return (
    <div
      className={cn(
        "surface-panel group relative flex h-full flex-col transition-colors",
        densityClass[density],
        selected
          ? "border-primary"
          : "hover:border-primary/60 focus-within:border-primary/60",
        className,
      )}
    >
      {href ? (
        <a
          href={href}
          onClick={onClickOverlay}
          aria-label={ariaLabel}
          className="absolute inset-0 z-0 rounded-[3px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
      ) : null}
      {eyebrow || actions ? (
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <div className="mono-label-sm">{eyebrow}</div> : null}
          </div>
          {actions ? (
            <div className="flex items-center gap-1">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {title ? (
        <div className="relative z-10 mt-3 min-w-0">
          {typeof title === "string" ? (
            <h3 className="line-clamp-2 font-display text-[20px] italic leading-tight text-foreground">
              {title}
            </h3>
          ) : (
            title
          )}
        </div>
      ) : null}
      {status ? <div className="relative z-10 mt-3">{status}</div> : null}
      {meta ? <div className="relative z-10 mt-3">{meta}</div> : null}
      {children ? (
        <div className="relative z-10 mt-3 min-w-0">{children}</div>
      ) : null}
      {footer ? (
        <div className="relative z-10 mt-auto border-t border-border/40 pt-4">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
