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
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-4xl">
        <div className="flex flex-col gap-2">
          {label ? <p className="eyebrow-label">{label}</p> : null}
          <h1 className="text-balance text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">
            {title}
          </h1>
        </div>
        <p className="mt-3 max-w-3xl text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
          {description}
        </p>
        {meta ? <div className="mt-4">{meta}</div> : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
