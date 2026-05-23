import type { ProjectOverviewKeyResult } from "@/lib/projects/overview";

export function ProjectKeyResults({
  items,
}: {
  items: ProjectOverviewKeyResult[];
}) {
  return (
    <section className="surface-panel p-6">
      <div>
        <p className="eyebrow-label">key results</p>
        <h2 className="mt-2 text-[20px] font-semibold leading-tight text-foreground">
          项目状态
        </h2>
      </div>

      <dl className="mt-5 space-y-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline justify-between gap-4 border-t border-border/60 pt-4 first:border-t-0 first:pt-0"
          >
            <dt className="mono-label-sm">{item.label}</dt>
            <dd className="text-right text-[16px] font-semibold text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
