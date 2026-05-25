"use client";

import { useMemo, useState } from "react";

import { finalizeNovelUpload, initNovelUpload } from "@/lib/upload/actions";
import { validateUploadFile } from "@/lib/upload/shared";
import { createClient } from "@/lib/supabase/client";

type UploadNovelInput = {
  file: File;
  mode: "single" | "dual";
  sessionId?: string;
  position?: 0 | 1;
};

export function useNovelUpload() {
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  async function uploadNovel(input: UploadNovelInput): Promise<
    | {
        ok: true;
        sessionId: string;
        redirectTo: string;
        message?: string;
        warnings?: string[];
      }
    | { ok: false; error: string }
  > {
    const fileError = validateUploadFile({
      name: input.file.name,
      size: input.file.size,
      type: input.file.type,
    });
    if (fileError) {
      return { ok: false, error: fileError };
    }

    setPending(true);
    setStatusText("// init upload session…");

    try {
      const initResult = await initNovelUpload({
        filename: input.file.name,
        size: input.file.size,
        contentType: input.file.type,
        mode: input.mode,
        sessionId: input.sessionId,
        position: input.position,
      });

      if ("error" in initResult) {
        return { ok: false, error: initResult.error ?? "上传失败。" };
      }

      setStatusText("// streaming to private storage…");
      const { error: uploadError } = await supabase.storage
        .from("novels")
        .upload(initResult.storageObjectPath, input.file, {
          contentType: input.file.type || "text/plain",
          upsert: false,
        });

      if (uploadError) {
        return { ok: false, error: "上传原始文件失败，请稍后重试。" };
      }

      setStatusText("// parsing text + writing session…");
      const finalizeResult = await finalizeNovelUpload({
        sessionId: initResult.sessionId,
        storageObjectPath: initResult.storageObjectPath,
        filename: input.file.name,
        size: input.file.size,
        contentType: input.file.type,
        position: initResult.position,
      });

      if ("error" in finalizeResult) {
        return { ok: false, error: finalizeResult.error ?? "上传失败。" };
      }

      return {
        ok: true,
        sessionId: initResult.sessionId,
        redirectTo: finalizeResult.redirectTo,
        message: finalizeResult.message,
        warnings: finalizeResult.warnings,
      };
    } catch {
      return { ok: false, error: "上传失败，请稍后重试。" };
    } finally {
      setPending(false);
      setStatusText(null);
    }
  }

  return { uploadNovel, pending, statusText, setStatusText };
}
