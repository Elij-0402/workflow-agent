"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCompare, History, LayoutDashboard, Settings, Sparkles, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  token: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  key: string;
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    key: "workspace",
    label: "workspace",
    items: [
      { href: "/dashboard", label: "概览", token: "overview", icon: LayoutDashboard },
      { href: "/sessions", label: "项目", token: "sessions", icon: History },
    ],
  },
  {
    key: "create",
    label: "create",
    items: [{ href: "/upload", label: "新建项目", token: "import", icon: Upload }],
  },
  {
    key: "tools",
    label: "tools",
    items: [
      { href: "/compare", label: "对比研究", token: "compare", icon: GitCompare },
      { href: "/studio", label: "生成实验台", token: "studio", icon: Sparkles },
    ],
  },
];

const FOOTER_ITEM: NavItem = {
  href: "/settings",
  label: "设置",
  token: "config",
  icon: Settings,
};

export const APP_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), FOOTER_ITEM];

type AppNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AppNav({ onNavigate, className }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-3", className)} aria-label="主导航">
      {NAV_GROUPS.map((group) => (
        <div key={group.key} className="flex flex-col">
          <p className="eyebrow-label mb-1 px-3 text-[10px] tracking-[0.18em]">{group.label}</p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
      <div className="mt-1 border-t border-dashed border-border/40 pt-2">
        <NavLink item={FOOTER_ITEM} pathname={pathname} onNavigate={onNavigate} />
      </div>
    </nav>
  );
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const { href, label, token, icon: Icon } = item;
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      style={{ transitionDuration: "var(--duration-fast)" }}
    >
      <span
        className={cn(
          "absolute bottom-2 left-0 top-2 w-[2px] transition-all",
          active ? "bg-primary" : "bg-transparent group-hover:bg-primary/30",
        )}
        style={{ transitionDuration: "var(--duration-fast)" }}
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
}
