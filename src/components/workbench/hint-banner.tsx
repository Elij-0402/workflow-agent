"use client";

import type { Hint } from "@/lib/workbench/derive-hint";

export function HintBanner({ hint }: { hint: Hint }) {
  return (
    <div className="surface-subtle flex items-center px-4 py-2" role="status" aria-live="polite">
      <p className="font-mono text-[11.5px] tracking-[0.06em] text-primary/90">{hint.text}</p>
    </div>
  );
}
