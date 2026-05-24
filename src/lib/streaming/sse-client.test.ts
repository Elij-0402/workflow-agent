import assert from "node:assert/strict";
import test from "node:test";

import { consumeSseStream, parseSseEvent } from "./sse-client";

test("parseSseEvent parses event and data lines", () => {
  const parsed = parseSseEvent('event: done\ndata: {"ok":true}');
  assert.deepEqual(parsed, { type: "done", data: '{"ok":true}' });
});

test("parseSseEvent returns null when data is missing", () => {
  assert.equal(parseSseEvent("event: ping"), null);
});

test("consumeSseStream marks interrupted when stream ends without done or error", async () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('event: partial\ndata: {"x":1}\n\n'));
      controller.close();
    },
  });

  const events: string[] = [];
  const state = await consumeSseStream(body, (event) => {
    events.push(event.type);
  });

  assert.deepEqual(events, ["partial"]);
  assert.equal(state, "interrupted");
});

test("consumeSseStream returns done when terminal event arrives", async () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('event: done\ndata: {"ok":true}\n\n'));
      controller.close();
    },
  });

  const state = await consumeSseStream(body, () => {});
  assert.equal(state, "done");
});
