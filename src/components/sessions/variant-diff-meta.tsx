"use client";

import { diffMeta } from "@/lib/diff/variant-diff";

export function VariantDiffMeta({
  left,
  right,
}: {
  left: Record<string, unknown>;
  right: Record<string, unknown>;
}) {
  const d = diffMeta(left, right);
  const rows = Object.entries(d).filter(([k]) => !k.includes("."));
  return (
    <div className="overflow-hidden rounded-[3px] border border-border">
      <div className="grid grid-cols-[160px_1fr_1fr] gap-2 border-b border-dashed border-border/70 bg-muted/40 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
        <span>field</span>
        <span>left</span>
        <span>right</span>
      </div>
      <div className="divide-y divide-dashed divide-border/40">
        {rows.map(([key, v]) => (
          <div
            key={key}
            className={`grid grid-cols-[160px_1fr_1fr] gap-2 px-3 py-2 font-mono text-[12px] ${
              v.same ? "text-muted-foreground" : "bg-primary/8 text-foreground"
            }`}
          >
            <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-primary/75">
              {key}
            </div>
            <div className="truncate">{JSON.stringify(v.left)}</div>
            <div className="truncate">{JSON.stringify(v.right)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
