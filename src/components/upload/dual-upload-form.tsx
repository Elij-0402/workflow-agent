"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { finalizeNovelUpload, initNovelUpload } from "@/lib/upload/actions";
import { MAX_UPLOAD_BYTES, validateUploadFile } from "@/lib/upload/shared";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";

type SlotKey = "A" | "B";

type SlotFile = {
  file: File | null;
  name: string;
  size: number | null;
};

const EMPTY_SLOT: SlotFile = { file: null, name: "", size: null };

export function DualUploadForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inputARef = useRef<HTMLInputElement | null>(null);
  const inputBRef = useRef<HTMLInputElement | null>(null);

  const [slotA, setSlotA] = useState<SlotFile>(EMPTY_SLOT);
  const [slotB, setSlotB] = useState<SlotFile>(EMPTY_SLOT);
  const [pending, setPending] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const hasA = Boolean(slotA.file);
  const hasB = Boolean(slotB.file);
  const canSubmit = hasA;

  function pickSlot(slot: SlotKey, file: File | null) {
    const next: SlotFile = file
      ? { file, name: file.name, size: file.size }
      : EMPTY_SLOT;
    if (slot === "A") setSlotA(next);
    else setSlotB(next);
  }

  function clearSlot(slot: SlotKey) {
    if (pending) return;
    if (slot === "A") {
      setSlotA(EMPTY_SLOT);
      if (inputARef.current) inputARef.current.value = "";
    } else {
      setSlotB(EMPTY_SLOT);
      if (inputBRef.current) inputBRef.current.value = "";
    }
  }

  async function uploadOne(
    file: File,
    sessionId: string | undefined,
    position: 0 | 1,
    progressLabel: string
  ): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
    setStatusText(progressLabel);

    const initResult = await initNovelUpload({
      filename: file.name,
      size: file.size,
      contentType: file.type,
      mode: "dual",
      sessionId,
      position,
    });
    if ("error" in initResult) {
      return { ok: false, error: initResult.error ?? "上传失败。" };
    }

    const { error: uploadError } = await supabase.storage
      .from("novels")
      .upload(initResult.storageObjectPath, file, {
        contentType: file.type || "text/plain",
        upsert: false,
      });
    if (uploadError) {
      return { ok: false, error: "上传原始文件失败，请稍后重试。" };
    }

    const finalize = await finalizeNovelUpload({
      sessionId: initResult.sessionId,
      storageObjectPath: initResult.storageObjectPath,
      filename: file.name,
      size: file.size,
      contentType: file.type,
      position: initResult.position,
    });
    if ("error" in finalize) {
      return { ok: false, error: finalize.error ?? "上传失败。" };
    }

    return { ok: true, sessionId: initResult.sessionId };
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slotA.file) {
      toast.error("请至少选择书 A。");
      return;
    }

    const aError = validateUploadFile({
      name: slotA.file.name,
      size: slotA.file.size,
      type: slotA.file.type,
    });
    if (aError) {
      toast.error(`书 A：${aError}`);
      return;
    }
    if (slotB.file) {
      const bError = validateUploadFile({
        name: slotB.file.name,
        size: slotB.file.size,
        type: slotB.file.type,
      });
      if (bError) {
        toast.error(`书 B：${bError}`);
        return;
      }
    }

    setPending(true);
    try {
      const aResult = await uploadOne(
        slotA.file,
        undefined,
        0,
        "// uploading book A…"
      );
      if (!aResult.ok) {
        toast.error(`书 A：${aResult.error}`);
        return;
      }

      const sessionId = aResult.sessionId;

      if (slotB.file) {
        const bResult = await uploadOne(
          slotB.file,
          sessionId,
          1,
          "// uploading book B…"
        );
        if (!bResult.ok) {
          toast.error(`书 B：${bResult.error}（书 A 已保留，可在工作台继续上传 B）`);
          router.push(`/sessions/${sessionId}/workbench`);
          return;
        }
        toast.success("两本书都已上传。");
      } else {
        toast.success("书 A 已上传，可在工作台继续上传 B。");
      }

      router.push(`/sessions/${sessionId}/workbench`);
    } catch {
      toast.error("上传失败，请稍后重试。");
    } finally {
      setPending(false);
      setStatusText(null);
    }
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-5"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FileSlot
          slot="A"
          state={slotA}
          pending={pending}
          inputRef={inputARef}
          onPick={(f) => pickSlot("A", f)}
          onClear={() => clearSlot("A")}
        />
        <FileSlot
          slot="B"
          state={slotB}
          pending={pending}
          inputRef={inputBRef}
          onPick={(f) => pickSlot("B", f)}
          onClear={() => clearSlot("B")}
        />
      </div>

      {statusText ? (
        <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-primary">
          {statusText}
        </p>
      ) : null}

      <div className="surface-subtle flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted-foreground">
          {!hasA
            ? "// 至少选择书 A"
            : hasB
              ? "// 两本都填，一次提交完成"
              : "// 只有 A，提交后稍后再传 B"}
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
              {hasB ? "开始双书任务" : "上传 A，稍后传 B"}
            </>
          )}
        </Button>
      </div>

      <div className="surface-subtle p-5 text-[13px] leading-7 text-muted-foreground">
        <p className="eyebrow-label">tip</p>
        <p className="mt-3">
          每本上限 {formatBytes(MAX_UPLOAD_BYTES, 0)}。上传后两本书的章节会进入素材区，参与下方蓝图合并与变体生成。
        </p>
      </div>
    </form>
  );
}

function FileSlot({
  slot,
  state,
  pending,
  inputRef,
  onPick,
  onClear,
}: {
  slot: SlotKey;
  state: SlotFile;
  pending: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | null) => void;
  onClear: () => void;
}) {
  const ready = Boolean(state.file);
  return (
    <section
      className={cn(
        "surface-panel frame-corners relative flex min-h-[260px] flex-col gap-5 p-6",
        ready ? "border-primary/40" : ""
      )}
    >
      <span className="frame-tr" aria-hidden />
      <span className="frame-bl" aria-hidden />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary/85">
            {ready ? `// book ${slot} · ready` : `// book ${slot} · awaiting`}
          </p>
          <h3 className="mt-2 font-display italic text-[20px] leading-tight text-foreground">
            书 {slot}
          </h3>
        </div>
        <span className="font-mono text-[24px] leading-none text-primary/55">
          {slot}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".txt,text/plain"
        disabled={pending}
        className="sr-only"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      {ready ? (
        <div className="rounded-[2px] border border-border bg-background/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-[2px] border border-primary/40 bg-card text-primary">
              <FileText aria-hidden className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[13px] text-foreground">
                {state.name}
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {state.size == null ? "waiting…" : formatBytes(state.size)} · txt
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-[2px] border border-dashed border-border/60 bg-background/30 px-4 py-8 text-center">
          <UploadCloud
            className="h-10 w-10 text-primary/50"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="mt-3 font-display italic text-[16px] leading-tight text-foreground">
            选择书 {slot} 的 .txt
          </p>
          {slot === "B" ? (
            <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              {"// 可留空 · 之后再补"}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-border/60 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud />
          {ready ? "更换" : "选择文件"}
        </Button>
        {ready ? (
          <button
            type="button"
            onClick={onClear}
            disabled={pending}
            className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-destructive"
          >
            $ clear
          </button>
        ) : null}
      </div>
    </section>
  );
}
