"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  FolderKanban,
  GitCompare,
  LibraryBig,
  Settings,
  Sparkles,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof FolderKanban;
};

export const PRIMARY_NAV_ITEM: NavItem = {
  href: "/sessions",
  label: "项目",
  icon: FolderKanban,
};

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { href: "/studio", label: "创作台", icon: Sparkles },
  { href: "/compare", label: "对比", icon: GitCompare },
  { href: "/library", label: "资料库", icon: LibraryBig },
];

export const FOOTER_ITEMS: NavItem[] = [
  { href: "/settings", label: "设置", icon: Settings },
];

export const APP_NAV_ITEMS: NavItem[] = [
  PRIMARY_NAV_ITEM,
  ...SECONDARY_NAV_ITEMS,
  ...FOOTER_ITEMS,
];

type AppNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export function AppNav({ onNavigate, className }: AppNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav className={cn("flex flex-col gap-0.5", className)} aria-label="主导航">
      <NavLink
        item={PRIMARY_NAV_ITEM}
        pathname={pathname}
        onNavigate={onNavigate}
        variant="primary"
      />

      <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
        <CollapsibleTrigger
          className={cn(
            "group flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
          )}
          style={{ transitionDuration: "var(--duration-fast)" }}
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform",
              moreOpen && "rotate-90",
            )}
            strokeWidth={1.5}
          />
          <span className="type-mono-label truncate">更多工具</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-0.5 pl-4">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              variant="secondary"
            />
          ))}
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-2 flex flex-col gap-0.5 border-t border-dashed border-border/40 pt-2">
        {FOOTER_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
            variant="secondary"
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
  variant,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  variant: "primary" | "secondary";
}) {
  const { href, label, icon: Icon } = item;
  const active =
    variant === "primary"
      ? pathname === href || pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

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
        variant === "secondary" && !active && "text-muted-foreground",
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
            ? "text-foreground"
            : "text-muted-foreground/70 group-hover:text-foreground",
        )}
        strokeWidth={1.5}
      />
      <span className="type-body truncate">{label}</span>
    </Link>
  );
}
