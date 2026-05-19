import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({
  title,
  description,
  action,
  meta,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl space-y-2">
        <h1 className="text-balance text-[28px] font-medium tracking-tight text-foreground sm:text-[32px]">
          {title}
        </h1>
        <p className="max-w-2xl text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
          {description}
        </p>
        {meta ? <div>{meta}</div> : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
