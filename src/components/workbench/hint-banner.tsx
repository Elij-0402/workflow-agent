"use client";

import type { Hint } from "@/lib/workbench/derive-hint";

export function HintBanner({ hint }: { hint: Hint }) {
  return (
    <div
      className="surface-subtle flex items-center px-4 py-2"
      role="status"
      aria-live="polite"
    >
      <p className="type-caption leading-6 text-muted-foreground">{hint.text}</p>
    </div>
  );
}
