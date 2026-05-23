import assert from "node:assert/strict";
import test from "node:test";

import { groupSessionsByMode } from "./group";

test("groupSessionsByMode places dual sessions first bucket and everything else in single bucket", () => {
  const result = groupSessionsByMode([
    { id: "dual-1", mode: "dual" },
    { id: "single-1", mode: "single" },
    { id: "legacy-1", mode: "legacy" },
    { id: "dual-2", mode: "dual" },
  ]);

  assert.deepEqual(
    result.dual.map((session) => session.id),
    ["dual-1", "dual-2"],
  );
  assert.deepEqual(
    result.single.map((session) => session.id),
    ["single-1", "legacy-1"],
  );
});
