"use client";

import { useMemo, useState } from "react";

import { diffParagraphs, splitParagraphs } from "@/lib/diff/variant-diff";

export function VariantDiffParagraphs({ left, right }: { left: string; right: string }) {
  const [open, setOpen] = useState<{ side: "a" | "b"; index: number } | null>(null);
  const data = useMemo(() => {
    const a = splitParagraphs(left);
    const b = splitParagraphs(right);
    const { aOnly, bOnly } = diffParagraphs(a, b);
    return { a, b, aOnly, bOnly };
  }, [left, right]);

  return (
    <div className="grid grid-cols-2 gap-4 text-[13px]">
      <Column
        label="left only"
        count={data.aOnly.length}
        items={data.aOnly}
        tone="destructive"
        onOpen={(index) => setOpen({ side: "a", index })}
      />
      <Column
        label="right only"
        count={data.bOnly.length}
        items={data.bOnly}
        tone="flash"
        onOpen={(index) => setOpen({ side: "b", index })}
      />
      {open ? (
        <Drawer
          paragraph={open.side === "a" ? data.a[open.index] : data.b[open.index]}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

function Column({
  label,
  count,
  items,
  tone,
  onOpen,
}: {
  label: string;
  count: number;
  items: { index: number; paragraph: string }[];
  tone: "destructive" | "flash";
  onOpen: (index: number) => void;
}) {
  return (
    <div>
      <h4 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
        {`// ${label} · ${count}`}
      </h4>
      <ul className="space-y-1">
        {items.length === 0 ? (
          <li className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            {"// no diff"}
          </li>
        ) : null}
        {items.map((it) => (
          <li
            key={it.index}
            className={`cursor-pointer truncate rounded-[2px] border px-2 py-1.5 font-mono text-[12px] transition-colors ${
              tone === "destructive"
                ? "bg-destructive/8 border-destructive/30 hover:bg-destructive/15"
                : "bg-flash/8 border-flash/30 hover:bg-flash/15"
            }`}
            onClick={() => onOpen(it.index)}
          >
            <span className="mr-2 text-primary/70">#{String(it.index + 1).padStart(3, "0")}</span>
            {it.paragraph.slice(0, 80)}
            {it.paragraph.length > 80 ? "…" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Drawer({ paragraph, onClose }: { paragraph: string; onClose: () => void }) {
  return (
    <div className="surface-panel fixed inset-y-0 right-0 z-30 w-[460px] overflow-auto bg-background p-5">
      <div className="flex items-center justify-between border-b border-dashed border-border/70 pb-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
          {"// paragraph"}
        </p>
        <button
          type="button"
          className="text-[12px] text-muted-foreground hover:text-primary"
          onClick={onClose}
        >
          关闭
        </button>
      </div>
      <pre className="mt-4 whitespace-pre-wrap font-mono text-[12.5px] leading-7 text-foreground">
        {paragraph}
      </pre>
    </div>
  );
}
