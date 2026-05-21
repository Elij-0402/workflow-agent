"use client";

import { detectChapters } from "@/lib/text/chapters";
import { diffStructure } from "@/lib/diff/variant-diff";

export function VariantDiffStructure({ left, right }: { left: string; right: string }) {
  const leftTitles = detectChapters(left).map((c) => c.title);
  const rightTitles = detectChapters(right).map((c) => c.title);
  const d = diffStructure(leftTitles, rightTitles);
  if (leftTitles.length === 0 && rightTitles.length === 0) {
    return (
      <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
        {"// no chapter titles detected"}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 text-[13px]">
      <div>
        <h4 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
          {`// left · ${leftTitles.length}`}
        </h4>
        <ul className="space-y-1 font-mono text-[12px]">
          {leftTitles.map((t, i) => {
            const removed = d.removed.includes(t);
            return (
              <li
                key={`${t}-${i}`}
                className={
                  removed
                    ? "rounded-[2px] border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive line-through"
                    : "px-2 py-1 text-foreground"
                }
              >
                <span className="mr-2 text-primary/60">{String(i + 1).padStart(2, "0")}</span>
                {t}
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <h4 className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-primary/80">
          {`// right · ${rightTitles.length}`}
        </h4>
        <ul className="space-y-1 font-mono text-[12px]">
          {rightTitles.map((t, i) => {
            const added = d.added.includes(t);
            return (
              <li
                key={`${t}-${i}`}
                className={
                  added
                    ? "rounded-[2px] border border-flash/40 bg-flash/10 px-2 py-1 text-flash"
                    : "px-2 py-1 text-foreground"
                }
              >
                <span className="mr-2 text-primary/60">{String(i + 1).padStart(2, "0")}</span>
                {t}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
