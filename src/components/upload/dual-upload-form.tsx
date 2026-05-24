"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { MAX_UPLOAD_BYTES, validateUploadFile } from "@/lib/upload/shared";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";

import { useNovelUpload } from "./use-novel-upload";

type SlotFile = {
  file: File;
  name: string;
  size: number;
};

export function DualUploadForm() {
  const router = useRouter();
  const { uploadNovel, pending, statusText } = useNovelUpload();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedBooks, setSelectedBooks] = useState<SlotFile[]>([]);
  const [selectionIssue, setSelectionIssue] = useState<string | null>(null);

  const canSubmit = selectedBooks.length === 2 && !selectionIssue;

  function resetPicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileSelection(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);

    if (files.length === 0) {
      setSelectedBooks([]);
      setSelectionIssue(null);
      return;
    }

    if (files.length > 2) {
      setSelectedBooks([]);
      setSelectionIssue(
        `你选择了 ${files.length} 本小说。当前每个任务最多支持 2 本参考小说，请重新选择两本。`,
      );
      resetPicker();
      return;
    }

    setSelectedBooks(
      files.map((file) => ({
        file,
        name: file.name,
        size: file.size,
      })),
    );
    setSelectionIssue(
      files.length === 1 ? "创建双书融合任务需要两本参考小说。" : null,
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedBooks.length === 0) {
      toast.error("请先选择两本参考小说。");
      return;
    }

    if (selectedBooks.length === 1) {
      toast.error("创建双书融合任务需要两本参考小说。");
      return;
    }

    if (selectedBooks.length > 2 || selectionIssue) {
      toast.error(selectionIssue ?? "当前每个任务最多支持 2 本参考小说。");
      return;
    }

    for (const [index, book] of selectedBooks.entries()) {
      const fileError = validateUploadFile({
        name: book.name,
        size: book.size,
        type: book.file.type,
      });
      if (fileError) {
        toast.error(`参考书 ${index + 1}：${fileError}`);
        return;
      }
    }

    const firstResult = await uploadNovel({
      file: selectedBooks[0].file,
      mode: "dual",
      position: 0,
    });
    if (!firstResult.ok) {
      toast.error(`参考书 1：${firstResult.error}`);
      return;
    }

    const secondResult = await uploadNovel({
      file: selectedBooks[1].file,
      mode: "dual",
      sessionId: firstResult.sessionId,
      position: 1,
    });
    if (!secondResult.ok) {
      toast.error(`参考书 2：${secondResult.error}`);
      router.push(`/sessions/${firstResult.sessionId}`);
      return;
    }

    if (firstResult.warnings?.length || secondResult.warnings?.length) {
      toast.warning("两本参考书原文已导入，但其中至少一本存在导入告警。");
    } else {
      toast.success("两本参考书已导入，正在进入蓝图工作台。");
    }
    router.push(secondResult.redirectTo);
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_340px]"
    >
      <section className="surface-panel p-7">
        <div className="flex flex-col gap-6">
          <div>
            <p className="eyebrow-label">dual source import</p>
            <h2 className="mt-2 font-display text-[24px] italic leading-[1.1] text-foreground">
              导入两本参考小说
            </h2>
            <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">
              一个任务固定使用两本参考小说。导入完成后会直接进入蓝图工作台，继续分析、融合与生成。
            </p>
          </div>

          <div className="rounded-[3px] border border-dashed border-border bg-background/40 p-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,text/plain"
              disabled={pending}
              className="sr-only"
              onChange={(event) => handleFileSelection(event.target.files)}
            />

            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary/85">
                    {selectedBooks.length === 2
                      ? "// 2 references ready"
                      : selectedBooks.length === 1
                        ? "// waiting for reference 2"
                        : "// select up to 2 references"}
                  </div>
                  <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
                    一次选择两本 `.txt` 参考小说。当前版本不支持在同一任务内导入第 3 本。
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud />
                  {selectedBooks.length > 0 ? "重新选择两本" : "选择两本文件"}
                </Button>
              </div>

              {selectedBooks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ReferenceCard index={0} book={selectedBooks[0] ?? null} />
                  <ReferenceCard index={1} book={selectedBooks[1] ?? null} />
                </div>
              ) : (
                <div className="rounded-[2px] border border-dashed border-border/60 bg-background/30 p-8 text-center">
                  <UploadCloud
                    className="mx-auto h-10 w-10 text-primary/50"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <p className="mt-3 font-display text-[18px] italic leading-tight text-foreground">
                    选择两本参考小说的 .txt 文件
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                    最多 2 本，导入后将直接创建任务并进入蓝图工作台
                  </p>
                </div>
              )}

              {selectionIssue ? (
                <div className="rounded-[2px] border border-destructive/35 bg-destructive/5 px-4 py-3 text-[13px] leading-6 text-destructive">
                  {selectionIssue}
                </div>
              ) : null}
            </div>
          </div>

          {statusText ? (
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-primary">
              {statusText}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-dashed border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground">
              {selectedBooks.length === 0
                ? "// 请选择两本参考小说"
                : selectedBooks.length === 1
                  ? "// 还差 1 本参考小说"
                  : "// 两本参考书已就绪"}
            </p>
            <Button type="submit" disabled={!canSubmit || pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  创建中…
                </>
              ) : (
                <>
                  <UploadCloud />
                  创建并进入工作台
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="surface-panel p-5">
          <p className="eyebrow-label">rules</p>
          <div className="mt-4 flex flex-col gap-3 text-[13px] leading-7 text-muted-foreground">
            <p>支持 `.txt` 文件，每本上限 {formatBytes(MAX_UPLOAD_BYTES, 0)}。</p>
            <p>每个任务固定 2 本参考小说；如果需要第 3 本，请新建任务。</p>
            <p>创建页会优先保留原文，再继续完成清洗、切章与导入体检。</p>
          </div>
        </section>

        <section className="surface-panel p-5">
          <p className="eyebrow-label">next</p>
          <div className="mt-4 flex flex-col gap-3 text-[13px] leading-7 text-muted-foreground">
            <p>1. 系统切章并整理两本参考小说。</p>
            <p>2. 若检测到乱码或广告，会在项目页给出导入体检与告警。</p>
            <p>3. 确认项目已就绪后，再进入工作台分析、融合与生成。</p>
          </div>
        </section>
      </aside>
    </form>
  );
}

function ReferenceCard({
  index,
  book,
}: {
  index: 0 | 1;
  book: SlotFile | null;
}) {
  const label = `参考书 ${index + 1}`;
  const slotLabel = `R${index + 1}`;

  if (!book) {
    return (
      <section className="surface-subtle flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary/70">
          {`// ${label} · awaiting`}
        </span>
        <span className="font-mono text-[24px] text-primary/35">{slotLabel}</span>
        <p className="font-display text-[18px] italic leading-tight text-foreground">
          {label}
        </p>
        <p className="max-w-xs text-[13px] leading-6 text-muted-foreground">
          还未选择。创建双书融合任务前，需要把两本参考小说一起导入。
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "surface-subtle flex min-h-[220px] flex-col gap-5 p-6",
        "border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary/85">
            {`// ${label} · ready`}
          </p>
          <h3 className="mt-2 font-display text-[20px] italic leading-tight text-foreground">
            {label}
          </h3>
        </div>
        <span className="font-mono text-[24px] leading-none text-primary/55">
          {slotLabel}
        </span>
      </div>

      <div className="rounded-[2px] border border-border bg-background/60 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-[2px] border border-primary/40 bg-card text-primary">
            <FileText aria-hidden className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-[13px] text-foreground">
              {book.name}
            </div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {formatBytes(book.size)} · txt
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto grid gap-3 border-t border-dashed border-border/60 pt-4 sm:grid-cols-2">
        <InfoStat label="身份" value={label} />
        <InfoStat label="状态" value="ready" />
      </div>
    </section>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[2px] border border-border bg-background/50 px-3 py-2.5">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/80">
        {label}
      </p>
      <p className="mt-1 text-[13px] text-foreground">{value}</p>
    </div>
  );
}
