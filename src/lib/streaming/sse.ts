type SseEvent =
  | { type: "partial"; data: unknown }
  | { type: "done"; data: unknown }
  | { type: "error"; message: string };

function formatEvent(event: SseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(
    event.type === "error" ? { message: event.message } : event.data,
  )}\n\n`;
}

/**
 * Wrap an async producer into a Server-Sent Events Response.
 * The producer receives an `emit` function and may throw — errors become a
 * single `event: error` then close the stream.
 */
export function sseResponse(
  producer: (emit: (event: SseEvent) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: SseEvent) => {
        controller.enqueue(encoder.encode(formatEvent(event)));
      };
      try {
        await producer(emit);
      } catch (e) {
        const message = e instanceof Error ? e.message : "stream failed";
        emit({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
