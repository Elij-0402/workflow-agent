"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutDashboard, Settings, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

export const APP_NAV_ITEMS = [
  { href: "/dashboard", label: "工作台", token: "workspace", icon: LayoutDashboard },
  { href: "/upload", label: "新建任务", token: "import", icon: Upload },
  { href: "/sessions", label: "我的项目", token: "sessions", icon: History },
  { href: "/settings", label: "设置", token: "config", icon: Settings },
] as const;

type AppNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AppNav({ onNavigate, className }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-0.5", className)} aria-label="主导航">
      {APP_NAV_ITEMS.map(({ href, label, token, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "absolute bottom-2 left-0 top-2 w-[2px] transition-all",
                active ? "bg-primary" : "bg-transparent group-hover:bg-primary/30",
              )}
              aria-hidden="true"
            />
            <Icon
              aria-hidden="true"
              className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                active ? "text-primary" : "text-muted-foreground/70 group-hover:text-foreground",
              )}
              strokeWidth={1.5}
            />
            <span className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="truncate text-[13px]">{label}</span>
              <span
                className={cn(
                  "ml-auto truncate font-mono text-[10px] uppercase tracking-[0.10em]",
                  active ? "text-primary/80" : "text-muted-foreground/50",
                )}
              >
                {token}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
