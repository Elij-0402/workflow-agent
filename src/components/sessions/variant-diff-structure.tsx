"use client";

import { detectChapters } from "@/lib/text/chapters";
import { diffStructure } from "@/lib/diff/variant-diff";

export function VariantDiffStructure({
  left,
  right,
}: {
  left: string;
  right: string;
}) {
  const leftTitles = detectChapters(left).map((c) => c.title);
  const rightTitles = detectChapters(right).map((c) => c.title);
  const d = diffStructure(leftTitles, rightTitles);
  if (leftTitles.length === 0 && rightTitles.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground">
        两份 variant 均未识别到章节标题。
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 text-[12.5px]">
      <div>
        <h4 className="mb-1 text-[11px] uppercase text-muted-foreground">
          左 · 共 {leftTitles.length}
        </h4>
        <ul className="space-y-0.5">
          {leftTitles.map((t, i) => (
            <li
              key={`${t}-${i}`}
              className={d.removed.includes(t) ? "text-rose-300" : ""}
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="mb-1 text-[11px] uppercase text-muted-foreground">
          右 · 共 {rightTitles.length}
        </h4>
        <ul className="space-y-0.5">
          {rightTitles.map((t, i) => (
            <li
              key={`${t}-${i}`}
              className={d.added.includes(t) ? "text-emerald-300" : ""}
            >
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
