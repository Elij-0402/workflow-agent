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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="surface-panel max-w-md space-y-3 p-5 text-[13px]">
        <h3 className="text-[15px] font-medium">
          本次将发起 {est.calls} 次 LLM 调用
        </h3>
        <p className="text-muted-foreground">
          按当前模型粗估约 ¥{est.estimatedCNY}（估算值，仅供参考）
          <br />
          输入 token ≈ {est.estimatedInputTokens.toLocaleString()}，输出 token ≈{" "}
          {est.estimatedOutputTokens.toLocaleString()}。
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={onConfirm}>开始分析</Button>
        </div>
      </div>
    </div>
  );
}
