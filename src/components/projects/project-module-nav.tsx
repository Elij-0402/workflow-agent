import Link from "next/link";

import { cn } from "@/lib/utils";

const MODULES = [
  { key: "概览", href: (sessionId: string) => `/sessions/${sessionId}` },
  { key: "参考书", href: (sessionId: string) => `/sessions/${sessionId}/workbench?step=analysis` },
  { key: "分析图谱", href: (sessionId: string) => `/sessions/${sessionId}/workbench?step=analysis` },
  { key: "蓝图工作台", href: (sessionId: string) => `/sessions/${sessionId}/workbench` },
  { key: "创意简报", href: (sessionId: string) => `/studio?sessionId=${sessionId}` },
  { key: "结果实验室", href: (sessionId: string) => `/sessions/${sessionId}/workbench?step=generate` },
] as const;

export function ProjectModuleNav({
  sessionId,
  current,
}: {
  sessionId: string;
  current: (typeof MODULES)[number]["key"];
}) {
  return (
    <nav
      className="surface-panel flex flex-wrap items-center gap-2 px-4 py-3"
      aria-label="项目模块"
    >
      {MODULES.map((module) => {
        const isCurrent = module.key === current;

        return (
          <Link
            key={module.key}
            href={module.href(sessionId)}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              "rounded-[4px] px-3 py-2 text-[12px] transition-colors",
              isCurrent
                ? "bg-primary/10 font-mono uppercase tracking-[0.08em] text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {module.key}
          </Link>
        );
      })}
    </nav>
  );
}
