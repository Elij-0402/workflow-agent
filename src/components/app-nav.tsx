"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, LayoutDashboard, Settings, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

export const APP_NAV_ITEMS = [
  { href: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/upload", label: "新建任务", icon: Upload },
  { href: "/sessions", label: "任务记录", icon: History },
  { href: "/settings", label: "设置", icon: Settings },
] as const;

type AppNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AppNav({ onNavigate, className }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="主导航">
      {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-w-0 items-center gap-3 rounded-[7px] border px-3 py-2.5 text-[13px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-border bg-accent/80 text-foreground"
                : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-accent/40 hover:text-foreground"
            )}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "opacity-100" : "opacity-70"
              )}
              strokeWidth={1.75}
            />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {active ? (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
