"use client";

import { Button } from "@/components/ui/button";

export default function CompareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-page">
      <div className="surface-panel max-w-xl p-6">
        <p className="eyebrow-label">加载失败</p>
        <h1 className="mt-2 text-[20px] font-semibold text-foreground">对比页暂时无法打开</h1>
        <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
          {error.message || "请稍后重试。"}
        </p>
        <Button className="mt-5" onClick={reset}>
          重试
        </Button>
      </div>
    </div>
  );
}
