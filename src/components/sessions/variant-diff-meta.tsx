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
  // top-level keys only (sub-keys are flattened with "." separator, skip them
  // here — they appear as their own row but we render the parent row instead).
  const rows = Object.entries(d).filter(([k]) => !k.includes("."));
  return (
    <div className="grid gap-1 text-[12.5px]">
      {rows.map(([key, v]) => (
        <div
          key={key}
          className={`grid grid-cols-[160px_1fr_1fr] gap-2 px-2 py-1 ${
            v.same ? "" : "bg-amber-300/10"
          }`}
        >
          <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            {key}
          </div>
          <div className="truncate">{JSON.stringify(v.left)}</div>
          <div className="truncate">{JSON.stringify(v.right)}</div>
        </div>
      ))}
    </div>
  );
}
