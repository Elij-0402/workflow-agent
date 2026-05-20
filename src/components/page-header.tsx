import type { ReactNode } from "react";

type PageHeaderProps = {
  label?: string;
  title: string;
  description: string;
  action?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({
  label,
  title,
  description,
  action,
  meta,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-4xl">
        <div className="flex flex-col gap-3">
          {label ? (
            <p className="eyebrow-label">{label.toLowerCase()}</p>
          ) : null}
          <h1 className="text-balance font-display italic text-[40px] leading-[1.04] tracking-[-0.01em] text-foreground sm:text-[48px]">
            {title}
          </h1>
        </div>
        <p className="mt-4 max-w-3xl text-[14px] leading-7 text-muted-foreground sm:text-[15px]">
          {description}
        </p>
        {meta ? (
          <div className="mt-5 flex flex-col gap-3">
            <span className="ascii-divider" aria-hidden="true" />
            {meta}
          </div>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
