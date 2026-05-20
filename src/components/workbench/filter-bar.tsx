"use client";

export type FilterState = {
  characters: string[];
  conflicts: string[];
  themeKeyword: string;
};

type Props = {
  options: { characters: string[]; conflicts: string[] };
  value: FilterState;
  onChange: (next: FilterState) => void;
};

export function FilterBar({ options, value, onChange }: Props) {
  const hasFilter =
    value.characters.length + value.conflicts.length > 0 ||
    value.themeKeyword.trim().length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-dashed border-border/60 px-3 py-2 text-[12px]">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
        {"// filter"}</span>
      <Multi
        label="characters"
        zh="人物"
        all={options.characters}
        selected={value.characters}
        onChange={(characters) => onChange({ ...value, characters })}
      />
      <Multi
        label="conflicts"
        zh="冲突"
        all={options.conflicts}
        selected={value.conflicts}
        onChange={(conflicts) => onChange({ ...value, conflicts })}
      />
      <input
        value={value.themeKeyword}
        onChange={(e) => onChange({ ...value, themeKeyword: e.target.value })}
        placeholder="主题关键词"
        className="h-7 rounded-[2px] border border-border bg-background/40 px-2 font-mono text-[12px] text-foreground placeholder:font-sans placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
      />
      {hasFilter ? (
        <button
          type="button"
          className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground hover:text-primary"
          onClick={() => onChange({ characters: [], conflicts: [], themeKeyword: "" })}
        >
          $ clear
        </button>
      ) : null}
    </div>
  );
}

function Multi({
  label,
  zh,
  all,
  selected,
  onChange,
}: {
  label: string;
  zh: string;
  all: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <details className="relative">
      <summary
        className={`cursor-pointer rounded-[2px] border px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
          selected.length > 0
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground"
        }`}
      >
        [ {label}
        {selected.length > 0 ? ` · ${selected.length}` : ""} ]
      </summary>
      <div className="absolute z-10 mt-1 max-h-60 w-52 overflow-auto rounded-[3px] border border-border bg-popover p-2 shadow-brass-soft">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-primary/70">
          {`// ${zh}`}
        </p>
        {all.length === 0 ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {"// no options"}</p>
        ) : null}
        {all.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 py-1 text-[12.5px] text-foreground"
            >
              <input
                type="checkbox"
                checked={checked}
                className="accent-primary"
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, opt]
                      : selected.filter((s) => s !== opt)
                  )
                }
              />
              <span className="truncate">{opt}</span>
            </label>
          );
        })}
      </div>
    </details>
  );
}
