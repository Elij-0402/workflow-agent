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

export function UploadForm() {
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
    setStatusText("正在初始化上传任务...");

    try {
      const initResult = await initNovelUpload({
        filename: selectedFile.name,
        size: selectedFile.size,
        contentType: selectedFile.type,
      });

      if ("error" in initResult) {
        toast.error(initResult.error);
        return;
      }

      setStatusText("正在直传原始文件到私有存储...");
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

      setStatusText("正在解析文本并写入分析会话...");
      const finalizeResult = await finalizeNovelUpload({
        sessionId: initResult.sessionId,
        storageObjectPath: initResult.storageObjectPath,
        filename: selectedFile.name,
        size: selectedFile.size,
        contentType: selectedFile.type,
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
    <form onSubmit={(event) => void onSubmit(event)} className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
      <section className="surface-panel p-6">
        <div className="flex flex-col gap-5">
          <div>
            <p className="eyebrow-label">Source Text</p>
            <h2 className="mt-2 text-[20px] font-medium tracking-tight text-foreground">
              选择小说文本
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
              当前版本支持单个 `.txt` 文件。导入后会直接创建任务并进入分析页。
            </p>
          </div>

          <div className="rounded-[8px] border border-dashed border-border/80 bg-background/35 p-5">
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
                  <div className="text-[14px] font-medium text-foreground">
                    {filename ? "已选择文件" : "还没有选择文件"}
                  </div>
                  <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
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
                  {filename ? "重新选择" : "选择文件"}
                </Button>
              </div>

              <div className="surface-subtle min-h-[172px] p-5">
                {filename ? (
                  <div className="flex h-full flex-col justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 items-center justify-center rounded-[8px] border border-border/70 bg-background/65 text-muted-foreground">
                        <FileText aria-hidden="true" className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-foreground">
                          {filename}
                        </div>
                        <div className="mt-1 text-[12px] text-muted-foreground">
                          {filesize == null ? "等待上传" : formatBytes(filesize)}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <InfoStat label="格式" value=".txt" />
                      <InfoStat
                        label="大小"
                        value={filesize == null ? "未知" : formatBytes(filesize, 0)}
                      />
                      <InfoStat label="状态" value={pending ? "处理中" : "已就绪"} />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="max-w-sm text-center">
                      <p className="text-[14px] font-medium text-foreground">等待导入文本</p>
                      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                        任务创建后，文本会进入私有存储，并生成清洗后的分析输入。
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {statusText ? (
            <p className="text-[13px] leading-6 text-muted-foreground">{statusText}</p>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">
              {filename ? "文件已准备好，可以开始。" : "先选文件，再开始任务。"}
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  创建中
                </>
              ) : (
                <>
                  <UploadCloud />
                  开始任务
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
            className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setHelpOpen((current) => !current)}
            aria-expanded={helpOpen}
          >
            {helpOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            文件要求
          </button>

          <div className="mt-4 flex flex-col gap-3 text-[13px] leading-6 text-muted-foreground">
            <p>支持 `.txt` 文件，大小上限 {formatBytes(MAX_UPLOAD_BYTES, 0)}。</p>
            <p>导入后会自动识别文本并创建分析任务。</p>
            {helpOpen ? (
              <p>当前先基于文本前段快速分析，方便你先判断结果质量。</p>
            ) : null}
          </div>
        </section>

        <section className="surface-subtle p-5">
          <p className="eyebrow-label">Pipeline</p>
          <div className="mt-3 flex flex-col gap-3 text-[13px] leading-6 text-muted-foreground">
            <p>1. 直传原始文本到私有存储。</p>
            <p>2. 服务端确认入库并清洗文本。</p>
            <p>3. 创建新的分析任务并进入任务详情页。</p>
          </div>
        </section>
      </aside>
    </form>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[7px] border border-border/70 bg-background/55 px-3 py-3">
      <p className="data-label">{label}</p>
      <p className="mt-2 text-[13px] text-foreground">{value}</p>
    </div>
  );
}
