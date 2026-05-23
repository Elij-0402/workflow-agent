type MetaRowProps = {
  items: Array<{
    label: string;
    value: string;
  }>;
};

export function MetaRow({ items }: MetaRowProps) {
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <dt className="text-muted-foreground/70">{item.label}</dt>
          <dd className="text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
