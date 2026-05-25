import { resolveStreamCompletionState } from "@/lib/streaming/client-state";

export function parseSseEvent(
  rawBlock: string,
): { type: string; data: string } | null {
  const lines = rawBlock.split("\n");
  let type = "message";
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) type = line.slice(6).trim();
    else if (line.startsWith("data:"))
      dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  return { type, data: dataLines.join("\n") };
}

export type SseHandler = (event: { type: string; data: unknown }) => void;

export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: SseHandler,
  signal?: AbortSignal,
): Promise<"done" | "error" | "interrupted"> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedDone = false;
  let receivedError = false;

  const onAbort = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener("abort", onAbort);

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const event = parseSseEvent(block);
        if (!event) continue;
        if (event.type === "done") receivedDone = true;
        if (event.type === "error") receivedError = true;
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(event.data) as unknown;
        } catch {
          // malformed payload — keep the terminal flag set above so the
          // caller still resolves to "done"/"error" rather than "interrupted"
        }
        onEvent({ type: event.type, data: parsed });
      }
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    try {
      reader.releaseLock();
    } catch {
      // reader may already be released by cancel()
    }
  }

  return resolveStreamCompletionState({ receivedDone, receivedError });
}
