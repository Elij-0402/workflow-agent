"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof History;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/sessions", label: "任务", icon: History },
];

const FOOTER_ITEMS: NavItem[] = [
  { href: "/settings", label: "设置", icon: Settings },
];

export const APP_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, ...FOOTER_ITEMS];

type AppNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AppNav({ onNavigate, className }: AppNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-0.5", className)} aria-label="主导航">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}
      <div className="mt-2 flex flex-col gap-0.5 border-t border-dashed border-border/40 pt-2">
        {FOOTER_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
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
  const { href, label, icon: Icon } = item;
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-w-0 items-center gap-3 px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
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
          active
            ? "text-primary"
            : "text-muted-foreground/70 group-hover:text-foreground",
        )}
        strokeWidth={1.5}
      />
      <span className="truncate text-[13px]">{label}</span>
    </Link>
  );
}
