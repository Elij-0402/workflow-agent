"use client";

import { useMemo, useState } from "react";

import { diffParagraphs, splitParagraphs } from "@/lib/diff/variant-diff";

export function VariantDiffParagraphs({
  left,
  right,
}: {
  left: string;
  right: string;
}) {
  const [open, setOpen] = useState<{ side: "a" | "b"; index: number } | null>(null);
  const data = useMemo(() => {
    const a = splitParagraphs(left);
    const b = splitParagraphs(right);
    const { aOnly, bOnly } = diffParagraphs(a, b);
    return { a, b, aOnly, bOnly };
  }, [left, right]);

  return (
    <div className="grid grid-cols-2 gap-3 text-[12.5px]">
      <Column
        title={`仅在左侧（${data.aOnly.length}）`}
        items={data.aOnly}
        onOpen={(index) => setOpen({ side: "a", index })}
      />
      <Column
        title={`仅在右侧（${data.bOnly.length}）`}
        items={data.bOnly}
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
  title,
  items,
  onOpen,
}: {
  title: string;
  items: { index: number; paragraph: string }[];
  onOpen: (index: number) => void;
}) {
  return (
    <div>
      <h4 className="mb-1 text-[11px] uppercase text-muted-foreground">{title}</h4>
      <ul className="space-y-1">
        {items.length === 0 ? (
          <li className="text-muted-foreground">无差异段落。</li>
        ) : null}
        {items.map((it) => (
          <li
            key={it.index}
            className="cursor-pointer truncate rounded-[6px] border border-border/40 bg-background/30 px-2 py-1.5 hover:bg-accent/30"
            onClick={() => onOpen(it.index)}
          >
            #{it.index + 1} {it.paragraph.slice(0, 80)}
            {it.paragraph.length > 80 ? "…" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Drawer({
  paragraph,
  onClose,
}: {
  paragraph: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 z-30 w-[420px] overflow-auto border-l border-border/70 bg-background/95 p-4">
      <button
        type="button"
        className="mb-3 text-[12px] text-muted-foreground hover:text-foreground"
        onClick={onClose}
      >
        关闭
      </button>
      <pre className="whitespace-pre-wrap text-[12.5px] leading-6 text-foreground">
        {paragraph}
      </pre>
    </div>
  );
}
