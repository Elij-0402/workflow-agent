import { resolveStreamCompletionState } from "@/lib/streaming/client-state";

export function parseSseEvent(rawBlock: string): { type: string; data: string } | null {
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

export type SseHandler = (event: { type: string; data: unknown }) => void;

export async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onEvent: SseHandler,
): Promise<"done" | "error" | "interrupted"> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedDone = false;
  let receivedError = false;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = parseSseEvent(block);
      if (!event) continue;
      try {
        const parsed = JSON.parse(event.data) as unknown;
        if (event.type === "done") receivedDone = true;
        if (event.type === "error") receivedError = true;
        onEvent({ type: event.type, data: parsed });
      } catch {
        // ignore malformed payloads
      }
    }
  }

  return resolveStreamCompletionState({ receivedDone, receivedError });
}
