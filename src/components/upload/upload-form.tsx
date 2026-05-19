"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { finalizeNovelUpload, initNovelUpload } from "@/lib/upload/actions";
import { MAX_UPLOAD_BYTES, validateUploadFile } from "@/lib/upload/shared";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBytes } from "@/lib/utils";

export function UploadForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [filename, setFilename] = useState("");
  const [filesize, setFilesize] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);

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
      router.refresh();
    } catch {
      toast.error("上传失败，请稍后重试。");
    } finally {
      setPending(false);
      setStatusText(null);
    }
  };

  return (
    <Card className="max-w-3xl border-border/60 bg-card/40 shadow-none">
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
          <UploadCloud aria-hidden="true" className="h-5 w-5" />
        </div>
        <CardTitle>上传小说文本</CardTitle>
        <CardDescription>
          仅支持 `.txt`。原始文件会先直传私有存储，再由服务端识别编码、清洗文本并切分章节元数据。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-5">
          <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-4">
            <div className="space-y-3">
              <Label htmlFor="file">小说文件</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".txt,text/plain"
                required
                disabled={pending}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);
                  setFilename(file?.name ?? "");
                  setFilesize(file?.size ?? null);
                }}
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                <span>大小上限 {formatBytes(MAX_UPLOAD_BYTES, 0)}</span>
                <span className="text-muted-foreground/40" aria-hidden="true">
                  /
                </span>
                <span>分析基于前约 8 万字符</span>
              </div>
            </div>
          </div>

          {filename ? (
            <div className="rounded-lg border border-border/60 bg-background/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileText aria-hidden="true" className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-foreground">
                    {filename}
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    {filesize == null ? "等待上传" : formatBytes(filesize)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {statusText ? (
            <div className="rounded-lg border border-border/60 bg-background/30 px-4 py-3 text-[13px] leading-6 text-muted-foreground">
              {statusText}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-muted-foreground">
              原始文件会先直传到私有存储，清洗后的文本再写入数据库，供后续分析直接读取。
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  上传中
                </>
              ) : (
                <>
                  <UploadCloud />
                  开始上传
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
