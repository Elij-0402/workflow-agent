"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, FileText, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { finalizeNovelUpload, initNovelUpload } from "@/lib/upload/actions";
import { MAX_UPLOAD_BYTES, validateUploadFile } from "@/lib/upload/shared";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";

export function UploadForm({
  mode = "single",
  sessionId,
  position,
}: {
  mode?: "single" | "dual";
  sessionId?: string;
  position?: 0 | 1;
} = {}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);
  const [filename, setFilename] = useState("");
  const [filesize, setFilesize] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      toast.error("请选择要上传的小说文件。");
      return;
    }

    const fileError = validateUploadFile({
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
    });

    if (fileError) {
      toast.error(fileError);
      return;
    }

    setPending(true);
    setStatusText("// init upload session…");

    try {
      const initResult = await initNovelUpload({
        filename: selectedFile.name,
        size: selectedFile.size,
        contentType: selectedFile.type,
        mode,
        sessionId,
        position,
      });

      if ("error" in initResult) {
        toast.error(initResult.error);
        return;
      }

      setStatusText("// streaming to private storage…");
      const { error: uploadError } = await supabase.storage
        .from("novels")
        .upload(initResult.storageObjectPath, selectedFile, {
          contentType: selectedFile.type || "text/plain",
          upsert: false,
        });

      if (uploadError) {
        toast.error("上传原始文件失败，请稍后重试。");
        return;
      }

      setStatusText("// parsing text + writing session…");
      const finalizeResult = await finalizeNovelUpload({
        sessionId: initResult.sessionId,
        storageObjectPath: initResult.storageObjectPath,
        filename: selectedFile.name,
        size: selectedFile.size,
        contentType: selectedFile.type,
        position: initResult.position,
      });

      if ("error" in finalizeResult) {
        toast.error(finalizeResult.error);
        return;
      }

      toast.success(finalizeResult.message ?? "上传成功。");
      router.push(finalizeResult.redirectTo);
    } catch {
      toast.error("上传失败，请稍后重试。");
    } finally {
      setPending(false);
      setStatusText(null);
    }
  };

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_340px]"
    >
      <section className="surface-panel p-7">
        <div className="flex flex-col gap-6">
          <div>
            <p className="eyebrow-label">source text</p>
            <h2 className="mt-2 font-display text-[24px] italic leading-[1.1] text-foreground">
              选择小说文本
            </h2>
            <p className="mt-2 text-[13.5px] leading-7 text-muted-foreground">
              当前版本支持单个 .txt 文件。导入后会直接创建任务并进入分析页。
            </p>
          </div>

          <div className="frame-corners relative rounded-[3px] border border-dashed border-border bg-background/40 p-6">
            <span className="frame-tr" aria-hidden />
            <span className="frame-bl" aria-hidden />
            <input
              ref={fileInputRef}
              id="file"
              name="file"
              type="file"
              accept=".txt,text/plain"
              disabled={pending}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                setFilename(file?.name ?? "");
                setFilesize(file?.size ?? null);
              }}
            />

            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary/85">
                    {filename ? "// file ready" : "// awaiting file"}
                  </div>
                  <p className="mt-2 text-[13px] leading-7 text-muted-foreground">
                    {filename
                      ? "确认文件无误后，直接开始创建任务。"
                      : "先选择文件，再进入分析流程。"}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud />
                  {filename ? "更换文件" : "选择文件"}
                </Button>
              </div>

              {filename ? (
                <div className="rounded-[2px] border border-border bg-background/60 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 items-center justify-center rounded-[2px] border border-primary/40 bg-card text-primary">
                      <FileText aria-hidden="true" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-[13px] text-foreground">
                        {filename}
                      </div>
                      <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                        {filesize == null ? "waiting…" : formatBytes(filesize)} · txt
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-dashed border-border/70 pt-4 sm:grid-cols-3">
                    <InfoStat label="format" value=".txt" />
                    <InfoStat
                      label="size"
                      value={filesize == null ? "unknown" : formatBytes(filesize, 0)}
                    />
                    <InfoStat label="status" value={pending ? "running" : "ready"} />
                  </div>
                </div>
              ) : (
                <div className="rounded-[2px] border border-dashed border-border/60 bg-background/30 p-8 text-center">
                  <UploadCloud
                    className="mx-auto h-10 w-10 text-primary/50"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <p className="mt-3 font-display text-[18px] italic leading-tight text-foreground">
                    将 .txt 文件拖到此处
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                    或点击右上角的「选择文件」
                  </p>
                </div>
              )}
            </div>
          </div>

          {statusText ? (
            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-primary">
              {statusText}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-dashed border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground">
              {filename ? "// file ready — start when ready" : "// select file first"}
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  创建中…
                </>
              ) : (
                <>
                  <UploadCloud />
                  开始新任务
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-4">
        <section className="surface-panel p-5">
          <button
            type="button"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.10em] text-primary/85 transition-colors hover:text-primary"
            onClick={() => setHelpOpen((current) => !current)}
            aria-expanded={helpOpen}
          >
            {helpOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {"// help · file requirements"}
          </button>

          <div className="mt-4 flex flex-col gap-3 text-[13px] leading-7 text-muted-foreground">
            <p>支持 .txt 文件，上限 {formatBytes(MAX_UPLOAD_BYTES, 0)}。</p>
            <p>导入后会自动识别文本并创建分析任务。</p>
            {helpOpen ? (
              <p className="border-l-[2px] border-primary/40 pl-3 italic">
                当前先基于文本前段快速分析，方便你先判断结果质量。
              </p>
            ) : null}
          </div>
        </section>

        <section className="surface-subtle p-5">
          <p className="eyebrow-label">pipeline</p>
          <ol className="mt-4 flex flex-col gap-2.5 font-mono text-[12px] text-muted-foreground">
            <li>
              <span className="text-primary/80">01 →</span> 直传原始文本到私有存储
            </li>
            <li>
              <span className="text-primary/80">02 →</span> 服务端确认入库并清洗文本
            </li>
            <li>
              <span className="text-primary/80">03 →</span> 创建新分析任务并跳转
            </li>
          </ol>
        </section>
      </aside>
    </form>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary/85">{label}</p>
      <p className="mt-1 font-mono text-[12.5px] text-foreground">{value}</p>
    </div>
  );
}
