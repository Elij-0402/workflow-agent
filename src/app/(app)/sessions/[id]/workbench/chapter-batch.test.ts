import { test } from "node:test";
import assert from "node:assert/strict";

import { runBatch } from "./chapter-batch";

test("runBatch respects concurrency cap", async () => {
  let active = 0;
  let peak = 0;
  const ids = Array.from({ length: 10 }, (_, i) => String(i));
  const { failures } = await runBatch({
    chapterIds: ids,
    concurrency: 3,
    onProgress: () => {},
    analyze: async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 20));
      active -= 1;
      return { ok: true };
    },
  });
  assert.equal(failures.length, 0);
  assert.ok(peak <= 3, `peak concurrency ${peak} > 3`);
});

test("runBatch reports failures without throwing", async () => {
  const { failures } = await runBatch({
    chapterIds: ["a", "b"],
    onProgress: () => {},
    analyze: async (id) =>
      id === "a" ? { ok: false, error: "boom" } : { ok: true },
  });
  assert.equal(failures.length, 1);
  assert.equal(failures[0].chapterId, "a");
  assert.equal(failures[0].error, "boom");
});

test("runBatch reports thrown errors as failures", async () => {
  const { failures } = await runBatch({
    chapterIds: ["a"],
    onProgress: () => {},
    analyze: async () => {
      throw new Error("network");
    },
  });
  assert.equal(failures.length, 1);
  assert.equal(failures[0].error, "network");
});

test("runBatch respects abort signal", async () => {
  const controller = new AbortController();
  const seen: string[] = [];
  setTimeout(() => controller.abort(), 30);
  await runBatch({
    chapterIds: Array.from({ length: 20 }, (_, i) => String(i)),
    concurrency: 2,
    signal: controller.signal,
    onProgress: (id, s) => {
      if (s === "running") seen.push(id);
    },
    analyze: async () => {
      await new Promise((r) => setTimeout(r, 25));
      return { ok: true };
    },
  });
  assert.ok(seen.length < 20, `expected partial progress, got ${seen.length}`);
});
