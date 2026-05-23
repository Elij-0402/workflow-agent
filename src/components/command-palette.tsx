"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GitCompare,
  History,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  Upload,
  type LucideIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Command = {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
};

const COMMANDS: Command[] = [
  { id: "dashboard", label: "概览", hint: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { id: "sessions", label: "我的项目", hint: "Sessions", href: "/sessions", icon: History },
  { id: "upload", label: "新建项目", hint: "Upload", href: "/upload", icon: Upload },
  { id: "compare", label: "对比研究", hint: "Compare", href: "/compare", icon: GitCompare },
  { id: "studio", label: "生成实验台", hint: "Studio", href: "/studio", icon: Sparkles },
  { id: "settings", label: "模型设置", hint: "Settings", href: "/settings", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  function runCommand(c: Command) {
    setOpen(false);
    setQuery("");
    router.push(c.href);
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtered[activeIdx];
      if (c) runCommand(c);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[20%] max-w-[520px] translate-y-0 gap-0 overflow-hidden p-0"
        onKeyDown={onListKey}
      >
        <DialogTitle className="sr-only">命令面板</DialogTitle>
        <DialogDescription className="sr-only">键入以搜索导航目标</DialogDescription>
        <div className="flex items-center gap-2 border-b border-border/70 px-4">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索页面、操作…"
            className="h-12 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>
        <ul className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-[13px] text-muted-foreground">
              没有匹配的命令。
            </li>
          ) : (
            filtered.map((c, i) => {
              const Icon = c.icon;
              const active = i === activeIdx;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => runCommand(c)}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors",
                      active ? "bg-accent text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden strokeWidth={1.5} />
                    <span className="flex-1 truncate">{c.label}</span>
                    {c.hint ? (
                      <span className="font-mono text-[10.5px] text-muted-foreground/60">
                        {c.hint}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ 选择 · Enter 打开</span>
          <span className="font-mono">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">⌘K</kbd>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
