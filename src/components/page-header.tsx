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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        <div className="flex flex-col gap-2">
          {label ? <p className="eyebrow-label">{label}</p> : null}
          <h1 className="text-balance text-[24px] font-semibold leading-tight text-foreground sm:text-[28px]">
            {title}
          </h1>
        </div>
        <p className="mt-3 max-w-2xl text-[13px] leading-6 text-muted-foreground sm:text-[14px]">
          {description}
        </p>
        {meta ? <div className="mt-4 flex flex-col gap-2">{meta}</div> : null}
      </div>

      {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
    </div>
  );
}
