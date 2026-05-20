"use client";

import { Button } from "@/components/ui/button";
import { estimateChapterBatchCost } from "@/lib/cost/estimate";

type Props = {
  open: boolean;
  chapterCount: number;
  avgChars: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CostEstimateModal({
  open,
  chapterCount,
  avgChars,
  onCancel,
  onConfirm,
}: Props) {
  if (!open) return null;
  const est = estimateChapterBatchCost({
    chapterCount,
    avgCharsPerChapter: avgChars,
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/72 backdrop-blur-[2px]">
      <div className="surface-panel max-w-md space-y-4 bg-card p-6">
        <div>
          <p className="eyebrow-label">cost preview</p>
          <h3 className="mt-2 font-display italic text-[22px] leading-tight text-foreground">
            本次将发起 {est.calls} 次 LLM 调用
          </h3>
        </div>

        <pre className="whitespace-pre overflow-x-auto rounded-[2px] border border-dashed border-border/70 bg-background/40 p-4 font-mono text-[12px] leading-7 text-muted-foreground">
{`calls          ──────  ${String(est.calls).padStart(6)}
avg chars      ──────  ${String(avgChars).padStart(6).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
input tokens   ──────  ~${est.estimatedInputTokens.toLocaleString().padStart(6)}
output tokens  ──────  ~${est.estimatedOutputTokens.toLocaleString().padStart(6)}
estimated cny  ──────  ¥${est.estimatedCNY}`}
        </pre>

        <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground">
          {"// 估算值，仅供参考"}</p>

        <div className="flex justify-end gap-2 border-t border-dashed border-border/70 pt-4">
          <Button variant="ghost" onClick={onCancel}>
            $ cancel
          </Button>
          <Button onClick={onConfirm}>$ confirm batch</Button>
        </div>
      </div>
    </div>
  );
}
