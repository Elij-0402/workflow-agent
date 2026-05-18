"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  History,
  LayoutDashboard,
  Settings,
  Upload,
} from "lucide-react";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "上传小说", icon: Upload },
  { href: "/sessions", label: "会话历史", icon: History },
  { href: "/settings", label: "设置", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[232px] shrink-0 flex-col border-r border-border/60 bg-background md:flex">
      <div className="flex h-12 items-center gap-2 px-4">
        <div className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-primary text-[11px] font-semibold text-primary-foreground">
          N
        </div>
        <span className="text-[13px] font-medium tracking-tight">
          NovelFusion
        </span>
      </div>

      <div className="px-4 pt-6 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        导航
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  active ? "opacity-100" : "opacity-70"
                )}
                strokeWidth={1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 text-[11px] text-muted-foreground/60">
        v0.1
      </div>
    </aside>
  );
}
