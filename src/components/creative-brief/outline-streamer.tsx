"use client";

import { useState } from "react";
import { Loader2, PlayCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { OutlineSchema, type Outline } from "@/lib/prompts/preview-outline";

type StreamState = "idle" | "running" | "done" | "error";

type Props = {
  briefId: string;
};

/**
 * Parses one SSE event chunk and returns { type, data } or null on malformed.
 * We do not depend on a third-party SSE client to keep bundle small.
 */
function parseEvent(rawBlock: string): { type: string; data: string } | null {
  const lines = rawBlock.split("\n");
  let type = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) type = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  return { type, data: dataLines.join("\n") };
}

export function OutlineStreamer({ briefId }: Props) {
  const [state, setState] = useState<StreamState>("idle");
  const [partial, setPartial] = useState<Partial<Outline> | null>(null);
  const [outline, setOutline] = useState<Outline | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const run = async () => {
    setState("running");
    setPartial(null);
    setOutline(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/generate/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId }),
      });
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}));
        const msg = (json as { error?: string }).error ?? `HTTP ${res.status}`;
        setErrorMsg(msg);
        setState("error");
        toast.error(`预生成失败：${msg}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedDone = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Split on the SSE event boundary "\n\n"
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const event = parseEvent(block);
          if (!event) continue;
          try {
            const parsed = JSON.parse(event.data) as unknown;
            if (event.type === "partial") {
              setPartial(parsed as Partial<Outline>);
            } else if (event.type === "done") {
              const payload = parsed as { outline?: unknown };
              const validated = OutlineSchema.safeParse(payload.outline);
              if (validated.success) {
                setOutline(validated.data);
                setState("done");
                receivedDone = true;
                toast.success("大纲已生成并保存。");
              } else {
                setErrorMsg("大纲格式校验失败。");
                setState("error");
              }
            } else if (event.type === "error") {
              const message = (parsed as { message?: string }).message ?? "stream error";
              setErrorMsg(message);
              setState("error");
              toast.error(message);
            }
          } catch {
            // ignore malformed event payloads
          }
        }
      }
      if (!receivedDone && state !== "error") {
        setErrorMsg("连接中断，请重试。");
        setState("error");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "网络异常";
      setErrorMsg(msg);
      setState("error");
      toast.error(msg);
    }
  };

  const showLive = partial && state === "running";
  const view = outline ?? (showLive ? (partial as Partial<Outline>) : null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-primary/85">
            {"// preview outline"}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            根据当前简报 + 已确认蓝图，流式合成一份新版本的大纲（不消耗整书 token）。
          </p>
        </div>
        <Button onClick={run} disabled={state === "running"} variant="terminal" size="sm">
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

      {errorMsg && state === "error" ? (
        <p className="bg-destructive/8 rounded-[3px] border border-destructive/40 px-3 py-2 font-mono text-[12px] text-destructive">
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
              <p className="text-[13.5px] leading-7 text-muted-foreground">{view.premise}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <p className="data-label">{"// chapters"}</p>
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
                    <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{ch.summary}</p>
                  ) : null}
                  {(ch?.key_events ?? []).length > 0 ? (
                    <ul className="mt-2 list-disc pl-5 text-[12.5px] leading-6 text-muted-foreground">
                      {(ch?.key_events ?? []).map((ev, idx) => (
                        <li key={idx}>{ev}</li>
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
  );
}
