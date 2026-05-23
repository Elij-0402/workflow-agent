type MetaRowProps = {
  items: Array<{
    label: string;
    value: string;
  }>;
};

export function MetaRow({ items }: MetaRowProps) {
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-3 text-[12px] text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <dt className="data-label">{item.label}</dt>
          <dd className="text-[12px] text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
