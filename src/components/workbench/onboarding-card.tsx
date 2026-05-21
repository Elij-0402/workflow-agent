"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "wb-onboarding-dismissed";

export function OnboardingCard() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed !== false) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore quota or privacy mode */
    }
    setDismissed(true);
  }

  return (
    <div className="surface-panel relative px-6 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow-label">get started</p>
        <button
          type="button"
          onClick={dismiss}
          className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground/60 transition-colors hover:text-foreground"
          style={{ transitionDuration: "var(--duration-fast)" }}
          aria-label="跳过引导"
        >
          $ skip
        </button>
      </div>
      <ol className="mt-3 space-y-2 text-[13px] leading-7 text-muted-foreground">
        <li className="flex gap-3">
          <span className="shrink-0 font-mono text-[11px] text-primary/85">01 →</span>
          <span>
            <span className="text-foreground">上传两本书</span> · 让系统知道你想融合什么
          </span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 font-mono text-[11px] text-primary/85">02 →</span>
          <span>
            <span className="text-foreground">章节分析</span> · 提取人物、冲突、世界规则候选
          </span>
        </li>
        <li className="flex gap-3">
          <span className="shrink-0 font-mono text-[11px] text-primary/85">03 →</span>
          <span>
            <span className="text-foreground">编辑蓝图 → 锁定 → 生成</span> · 产出融合后的新作
          </span>
        </li>
      </ol>
      <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/55">
        {"// 每一步会在上方流程条标出当前位置"}
      </p>
    </div>
  );
}
