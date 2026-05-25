"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { OutlineSchema, type Outline } from "@/lib/prompts/preview-outline";
import { consumeSseStream } from "@/lib/streaming/sse-client";

type StreamState = "idle" | "running" | "done" | "error";

type Props = {
  briefId: string;
  onOutlineReady?: (payload: { variantId: string; outline: Outline }) => void;
};

export function OutlineStreamer({ briefId, onOutlineReady }: Props) {
  const [state, setState] = useState<StreamState>("idle");
  const [partial, setPartial] = useState<Partial<Outline> | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const run = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState("running");
    setPartial(null);
    setOutline(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/generate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        const msg = (json as { error?: string }).error ?? `HTTP ${res.status}`;
        setErrorMsg(msg);
        setState("error");
        toast.error(`预生成失败：${msg}`);
        return;
      }

      const completion = await consumeSseStream(
        res.body,
        (event) => {
          if (event.type === "partial") {
            setPartial(event.data as Partial<Outline>);
          } else if (event.type === "done") {
            const payload = event.data as {
              outline?: unknown;
              variantId?: string;
            };
            const validated = OutlineSchema.safeParse(payload.outline);
            if (!validated.success) {
              setErrorMsg("大纲格式校验失败。");
              setState("error");
              return;
            }
            if (!payload.variantId) {
              setErrorMsg("大纲保存失败，请重试。");
              setState("error");
              return;
            }
            setOutline(validated.data);
            setState("done");
            onOutlineReady?.({
              variantId: payload.variantId,
              outline: validated.data,
            });
            toast.success("大纲已生成并保存。");
          } else if (event.type === "error") {
            const message =
              (event.data as { message?: string }).message ?? "stream error";
            setErrorMsg(message);
            setState("error");
            toast.error(message);
          }
        },
        controller.signal,
      );

      if (completion === "interrupted") {
        setErrorMsg("连接中断，请重试。");
        setState("error");
      }
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "网络异常";
      setErrorMsg(msg);
      setState("error");
      toast.error(msg);
    }
  };

  const showLive = partial && state === "running";
  const view = outline ?? (showLive ? (partial as Partial<Outline>) : null);

  return (
    <div className="space-y-4" aria-busy={state === "running"}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/85">
            预览大纲
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            根据当前简报 + 已确认蓝图，流式合成一份新版本的大纲（不消耗整书
            token）。
          </p>
        </div>
        <Button
          onClick={run}
          disabled={state === "running"}
          variant="terminal"
          size="sm"
        >
          {state === "running" ? (
            <>
              <Loader2 className="animate-spin" />
              生成中…
            </>
          ) : state === "done" || state === "error" ? (
            <>
              <RotateCcw />
              重新预生成
            </>
          ) : (
            <>
              <PlayCircle />
              预生成大纲
            </>
          )}
        </Button>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {errorMsg && state === "error" ? (
          <p className="rounded-[3px] border border-destructive/40 bg-destructive/8 px-3 py-2 font-mono text-[12px] text-destructive">
            {errorMsg}
          </p>
        ) : null}

        {view ? (
          <div className="surface-panel space-y-4 p-5">
            <div className="space-y-2">
              <h3 className="font-display text-[22px] italic leading-tight text-foreground">
                {view.title ?? "（生成中…）"}
              </h3>
              {view.premise ? (
                <p className="text-[13.5px] leading-7 text-muted-foreground">
                  {view.premise}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <p className="data-label">章节</p>
              <ol className="space-y-2">
                {(view.chapters ?? []).map((ch, i) => (
                  <li
                    key={`${ch?.index ?? i}-${ch?.title ?? ""}`}
                    className="rounded-[3px] border border-border bg-background/40 px-3 py-2"
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-primary/80">
                        ch{String(ch?.index ?? i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display text-[15px] italic text-foreground">
                        {ch?.title ?? "（…）"}
                      </span>
                    </div>
                    {ch?.summary ? (
                      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
                        {ch.summary}
                      </p>
                    ) : null}
                    {(ch?.key_events ?? []).length > 0 ? (
                      <ul className="mt-2 list-disc pl-5 text-[12.5px] leading-6 text-muted-foreground">
                        {(ch?.key_events ?? []).map((ev, idx) => (
                          <li key={`${idx}-${ev}`}>{ev}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
