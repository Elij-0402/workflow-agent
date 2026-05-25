"use client";

import { useCallback, useEffect, useState } from "react";

import type { AnalysisDimension } from "@/lib/types";

export type ClipboardItem = {
  id: string;
  kind: "insight" | "anchor" | "note";
  title: string;
  body?: string;
  dimension?: AnalysisDimension;
  bookLabel?: string;
  bookIndex?: number;
  createdAt: number;
};

const STORAGE_KEY = "compare:clipboard";
const MAX_ITEMS = 50;
const CHANGE_EVENT = "compare-clipboard-change";

function readAll(): ClipboardItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is ClipboardItem =>
        x &&
        typeof x === "object" &&
        typeof x.id === "string" &&
        typeof x.title === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(items: ClipboardItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_ITEMS)),
    );
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // ignore quota errors
  }
}

export function useClipboard() {
  const [items, setItems] = useState<ClipboardItem[]>([]);

  useEffect(() => {
    setItems(readAll());
    const handler = () => setItems(readAll());
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const add = useCallback((item: Omit<ClipboardItem, "id" | "createdAt">) => {
    const next: ClipboardItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
    };
    const current = readAll();
    writeAll([next, ...current]);
  }, []);

  const remove = useCallback((id: string) => {
    const current = readAll();
    writeAll(current.filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => {
    writeAll([]);
  }, []);

  return { items, add, remove, clear };
}

export function toMarkdown(items: ClipboardItem[], header?: string): string {
  const lines: string[] = [];
  if (header) {
    lines.push(`# ${header}`, "");
  } else {
    lines.push(`# 多书对比 · 剪贴板导出`, "");
  }
  lines.push(`> 生成于 ${new Date().toLocaleString("zh-CN")}`, "");
  if (items.length === 0) {
    lines.push("（剪贴板为空）");
    return lines.join("\n");
  }
  for (const it of items) {
    const meta = [it.bookLabel, it.dimension].filter(Boolean).join(" · ");
    lines.push(`## ${it.title}`);
    if (meta) lines.push(`\`${meta}\``, "");
    if (it.body) {
      lines.push(it.body, "");
    } else {
      lines.push("");
    }
  }
  return lines.join("\n");
}
