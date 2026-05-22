import { strict as assert } from "node:assert";
import { test } from "node:test";

import { deriveHint } from "./derive-hint";

const base = {
  importedCount: 0,
  chapterTotals: [],
  bookSynthesisDone: { a: false, b: false },
  blueprintStatus: "draft" as const,
  blueprintReady: false,
  variantCount: 0,
};

test("import step when fewer than 2 books", () => {
  const h = deriveHint({ ...base, importedCount: 1 });
  assert.equal(h.step, "import");
  assert.match(h.text, /参考书 2/);
});

test("chapter step when chapters pending", () => {
  const h = deriveHint({
    ...base,
    importedCount: 2,
    chapterTotals: [
      { bookId: "a", total: 10, analyzed: 4 },
      { bookId: "b", total: 8, analyzed: 8 },
    ],
  });
  assert.equal(h.step, "chapter");
  assert.match(h.text, /12 \/ 18/);
  assert.match(h.text, /剩余 6 章/);
});

test("synth step when both books need synthesis", () => {
  const h = deriveHint({
    ...base,
    importedCount: 2,
    chapterTotals: [
      { bookId: "a", total: 5, analyzed: 5 },
      { bookId: "b", total: 5, analyzed: 5 },
    ],
  });
  assert.equal(h.step, "synth");
  assert.match(h.text, /两本参考书/);
});

test("synth step when only book B pending", () => {
  const h = deriveHint({
    ...base,
    importedCount: 2,
    chapterTotals: [
      { bookId: "a", total: 5, analyzed: 5 },
      { bookId: "b", total: 5, analyzed: 5 },
    ],
    bookSynthesisDone: { a: true, b: false },
  });
  assert.equal(h.step, "synth");
  assert.match(h.text, /参考书 2/);
});

test("compare step when blueprint draft and not ready", () => {
  const h = deriveHint({
    ...base,
    importedCount: 2,
    chapterTotals: [{ bookId: "a", total: 5, analyzed: 5 }],
    bookSynthesisDone: { a: true, b: true },
    blueprintStatus: "draft",
    blueprintReady: false,
  });
  assert.equal(h.step, "compare");
});

test("confirm step when blueprint ready", () => {
  const h = deriveHint({
    ...base,
    importedCount: 2,
    chapterTotals: [{ bookId: "a", total: 5, analyzed: 5 }],
    bookSynthesisDone: { a: true, b: true },
    blueprintStatus: "draft",
    blueprintReady: true,
  });
  assert.equal(h.step, "confirm");
  assert.match(h.text, /可确认/);
});

test("generate step when confirmed but no variant", () => {
  const h = deriveHint({
    ...base,
    importedCount: 2,
    chapterTotals: [{ bookId: "a", total: 5, analyzed: 5 }],
    bookSynthesisDone: { a: true, b: true },
    blueprintStatus: "confirmed",
    blueprintReady: true,
    variantCount: 0,
  });
  assert.equal(h.step, "generate");
  assert.match(h.text, /生成新版本/);
});

test("generate step suggests comparison when variants ≥ 2", () => {
  const h = deriveHint({
    ...base,
    importedCount: 2,
    chapterTotals: [{ bookId: "a", total: 5, analyzed: 5 }],
    bookSynthesisDone: { a: true, b: true },
    blueprintStatus: "confirmed",
    blueprintReady: true,
    variantCount: 3,
  });
  assert.equal(h.step, "generate");
  assert.match(h.text, /多个生成版本/);
});
