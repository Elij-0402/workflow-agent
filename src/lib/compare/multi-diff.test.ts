import { test } from "node:test";
import assert from "node:assert/strict";

import { multiwayTag, pickByTag } from "./multi-diff";

test("empty input returns empty", () => {
  assert.deepEqual(
    multiwayTag([], (s: string) => s),
    [],
  );
});

test("N=2 common and exclusive", () => {
  const res = multiwayTag(
    [
      ["a", "b", "c"],
      ["b", "c", "d"],
    ],
    (s) => s,
  );
  const byKey = new Map(res.map((e) => [e.key, e]));
  assert.equal(byKey.get("a")?.tag, "exclusive");
  assert.equal(byKey.get("b")?.tag, "common");
  assert.equal(byKey.get("c")?.tag, "common");
  assert.equal(byKey.get("d")?.tag, "exclusive");
});

test("N=3 majority threshold = 2", () => {
  const res = multiwayTag(
    [
      ["x", "y"],
      ["y", "z"],
      ["y", "w"],
    ],
    (s) => s,
  );
  const byKey = new Map(res.map((e) => [e.key, e]));
  assert.equal(byKey.get("y")?.tag, "common");
  assert.equal(byKey.get("x")?.tag, "exclusive");
  assert.equal(byKey.get("w")?.tag, "exclusive");
  assert.equal(byKey.get("z")?.tag, "exclusive");

  const res2 = multiwayTag([["a", "b"], ["b"], ["b", "c"]], (s) => s);
  const m2 = new Map(res2.map((e) => [e.key, e]));
  assert.equal(m2.get("b")?.tag, "common");
});

test("N=4 majority threshold = 2", () => {
  const res = multiwayTag([["a"], ["a", "b"], ["b"], ["c"]], (s) => s);
  const byKey = new Map(res.map((e) => [e.key, e]));
  assert.equal(byKey.get("a")?.tag, "majority");
  assert.equal(byKey.get("b")?.tag, "majority");
  assert.equal(byKey.get("c")?.tag, "exclusive");
});

test("dedup within a single book", () => {
  const res = multiwayTag([["x", "x", "x"], ["y"]], (s) => s);
  const x = res.find((e) => e.key === "x");
  assert.equal(x?.bookIndices.length, 1);
  assert.equal(x?.tag, "exclusive");
});

test("trims and lowercases keys", () => {
  const res = multiwayTag([["  Hero  "], ["hero"]], (s) => s);
  assert.equal(res.length, 1);
  assert.equal(res[0]?.tag, "common");
});

test("pickByTag filter", () => {
  const entries = multiwayTag([["a", "b"], ["a"]], (s) => s);
  assert.equal(pickByTag(entries, "common").length, 1);
  assert.equal(pickByTag(entries, "exclusive").length, 1);
  assert.equal(pickByTag(entries, "any").length, 2);
});
