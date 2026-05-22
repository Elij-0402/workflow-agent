"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

type ToolbarProps = {
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  sort?: React.ReactNode;
  count?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Search + sort + filter combo strip. Used by variant-list, sessions, chapters, briefs.
 * All slots are optional — pass only what's relevant.
 */
export function Toolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "搜索…",
  filters,
  sort,
  count,
  actions,
  className,
}: ToolbarProps) {
  const showSearch = typeof searchValue !== "undefined" && onSearchChange;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-b border-border/60 pb-3",
        className,
      )}
    >
      {showSearch ? (
        <label className="surface-subtle flex h-9 min-w-[180px] flex-1 items-center gap-2 px-3">
          <Search className="h-3.5 w-3.5 text-muted-foreground/80" aria-hidden />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-full flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      ) : null}
      {filters ? <div className="flex items-center gap-2">{filters}</div> : null}
      {sort ? <div className="flex items-center gap-2">{sort}</div> : null}
      <div className="ml-auto flex items-center gap-2">
        {count ? (
          <span className="mono-label-xs text-muted-foreground/80">{count}</span>
        ) : null}
        {actions}
      </div>
    </div>
  );
}
