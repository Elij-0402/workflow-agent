"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const est = estimateChapterBatchCost({
    chapterCount,
    avgCharsPerChapter: avgChars,
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <p className="mono-label-sm text-muted-foreground/80">cost preview</p>
          <DialogTitle>本次将发起 {est.calls} 次 LLM 调用</DialogTitle>
          <DialogDescription className="sr-only">
            预估的章节批量分析成本：{est.calls} 次调用，约 ¥{est.estimatedCNY}。
          </DialogDescription>
        </DialogHeader>

        <pre className="overflow-x-auto whitespace-pre rounded-xs border border-border/70 bg-background/40 p-4 font-mono text-[12px] leading-7 text-muted-foreground">
{`calls          ──────  ${String(est.calls).padStart(6)}
avg chars      ──────  ${String(avgChars)
  .padStart(6)
  .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
input tokens   ──────  ~${est.estimatedInputTokens.toLocaleString().padStart(6)}
output tokens  ──────  ~${est.estimatedOutputTokens.toLocaleString().padStart(6)}
estimated cny  ──────  ¥${est.estimatedCNY}`}
        </pre>

        <p className="mono-label-xs text-muted-foreground">
          估算值，仅供参考
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={onConfirm}>确认开始</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
