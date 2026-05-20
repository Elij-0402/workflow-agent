type MetaRowProps = {
  items: Array<{
    label: string;
    value: string;
  }>;
};

export function MetaRow({ items }: MetaRowProps) {
  return (
    <dl className="flex flex-wrap items-center gap-x-1 gap-y-2 font-mono text-[12px] text-muted-foreground">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-2">
          {index > 0 ? (
            <span className="text-primary/40" aria-hidden="true">
              ·
            </span>
          ) : null}
          <dt className="data-label">{item.label}</dt>
          <dd className="text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
