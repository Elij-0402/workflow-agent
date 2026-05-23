type MetaRowProps = {
  items: Array<{
    label: string;
    value: string;
  }>;
};

export function MetaRow({ items }: MetaRowProps) {
  return (
    <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-2">
          {index > 0 ? (
            <span className="text-border" aria-hidden="true">
              /
            </span>
          ) : null}
          <dt className="mono-label-sm">{item.label}</dt>
          <dd className="text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
