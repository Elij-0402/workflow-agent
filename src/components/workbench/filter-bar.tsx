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
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 p-2 text-[12px]">
      <Multi
        label="人物"
        all={options.characters}
        selected={value.characters}
        onChange={(characters) => onChange({ ...value, characters })}
      />
      <Multi
        label="冲突"
        all={options.conflicts}
        selected={value.conflicts}
        onChange={(conflicts) => onChange({ ...value, conflicts })}
      />
      <input
        value={value.themeKeyword}
        onChange={(e) => onChange({ ...value, themeKeyword: e.target.value })}
        placeholder="主题关键词"
        className="h-7 rounded-[6px] border border-border/60 bg-background/40 px-2 text-[12px]"
      />
      {value.characters.length + value.conflicts.length > 0 ||
      value.themeKeyword.trim() ? (
        <button
          type="button"
          className="text-[11px] text-muted-foreground hover:text-foreground"
          onClick={() => onChange({ characters: [], conflicts: [], themeKeyword: "" })}
        >
          清空筛选
        </button>
      ) : null}
    </div>
  );
}

function Multi({
  label,
  all,
  selected,
  onChange,
}: {
  label: string;
  all: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <details className="relative">
      <summary className="cursor-pointer rounded-[6px] border border-border/60 px-2 py-1 text-foreground">
        {label}
        {selected.length > 0 ? ` (${selected.length})` : ""}
      </summary>
      <div className="absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded-[6px] border border-border/70 bg-background/95 p-2 shadow-md">
        {all.length === 0 ? (
          <p className="text-muted-foreground">无可选项</p>
        ) : null}
        {all.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <label key={opt} className="flex cursor-pointer items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={checked}
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
