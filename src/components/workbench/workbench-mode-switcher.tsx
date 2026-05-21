"use client";

export type WorkbenchMode = "chapters" | "blueprint" | "variants";

const MODES: Array<{ key: WorkbenchMode; label: string }> = [
  { key: "chapters", label: "章节" },
  { key: "blueprint", label: "蓝图" },
  { key: "variants", label: "变体" },
];

export function WorkbenchModeSwitcher({
  mode,
  onChange,
  variantsEnabled,
}: {
  mode: WorkbenchMode;
  onChange: (m: WorkbenchMode) => void;
  variantsEnabled: boolean;
}) {
  return (
    <div
      className="surface-subtle inline-flex items-center gap-0.5 px-1.5 py-1"
      role="tablist"
      aria-label="工作台模式切换"
    >
      {MODES.map((m) => {
        const disabled = m.key === "variants" && !variantsEnabled;
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            role="tab"
            data-active={active}
            disabled={disabled}
            onClick={() => onChange(m.key)}
            className="terminal-tab disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`切换至 ${m.label} 模式`}
            aria-selected={active}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
