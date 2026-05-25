"use client";

import { usePathname } from "next/navigation";

import {
  resolveShellTitle,
  shouldShowSessionsNextHint,
} from "@/lib/shell/shell-title";

export function ContextualShellTitle() {
  const pathname = usePathname();
  const title = resolveShellTitle(pathname);
  const showSessionsHint = shouldShowSessionsNextHint(pathname);

  return (
    <div className="hidden text-right md:block">
      <p className="type-mono-label">{title}</p>
      {showSessionsHint ? (
        <p className="type-caption mt-0.5">
          下一步：打开项目或新建双书
        </p>
      ) : null}
    </div>
  );
}
