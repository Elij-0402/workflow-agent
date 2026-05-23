"use client";

import { useState, type RefObject } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toMarkdown, useClipboard } from "@/lib/compare/clipboard";
import { toastError } from "@/lib/error-toast";
import { appBackgroundColor } from "@/lib/theme";

function downloadFile(filename: string, content: string | Blob, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(meta)?.[1] ?? "image/png";
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function ExportMenu({ snapshotRef }: { snapshotRef: RefObject<HTMLElement | null> }) {
  const [busy, setBusy] = useState(false);
  const { items, clear } = useClipboard();

  async function exportPng() {
    const target = snapshotRef.current;
    if (!target) {
      toastError("当前视图无可截取的内容");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await toPng(target, {
        backgroundColor: appBackgroundColor(),
        pixelRatio: 2,
        cacheBust: true,
        style: { transform: "none" },
      });
      const blob = dataUrlToBlob(dataUrl);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadFile(`compare-${stamp}.png`, blob, "image/png");
      toast.success("PNG 已下载");
    } catch {
      toastError("截图失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  function exportMarkdown() {
    if (items.length === 0) {
      toastError("剪贴板为空，先把感兴趣的洞察 / 锚点加入剪贴板");
      return;
    }
    const md = toMarkdown(items);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(`compare-clipboard-${stamp}.md`, md, "text/markdown");
    toast.success(`Markdown 已下载（${items.length} 条）`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          className="h-8 font-mono text-[11px] uppercase tracking-[0.08em]"
        >
          {busy ? "导出中…" : "导出 ▾"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-[0.10em] text-muted-foreground/70">
          export
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={exportPng}>
          <div className="flex w-full items-center justify-between">
            <span>PNG 海报</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">当前视图</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportMarkdown}>
          <div className="flex w-full items-center justify-between">
            <span>Markdown 报告</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">
              剪贴板 {items.length}
            </span>
          </div>
        </DropdownMenuItem>
        {items.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                clear();
                toast.success("剪贴板已清空");
              }}
              className="text-destructive focus:text-destructive"
            >
              清空剪贴板
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
