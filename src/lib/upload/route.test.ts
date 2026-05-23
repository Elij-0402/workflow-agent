import assert from "node:assert/strict";
import test from "node:test";

import { resolveUploadRoute } from "./route";

test("resolveUploadRoute keeps session-aware supplement uploads on the current page", () => {
  assert.deepEqual(resolveUploadRoute({ sessionId: "session-1" }), {
    kind: "supplement",
  });
});

test("resolveUploadRoute routes explicit modes to the correct upload flow", () => {
  assert.deepEqual(resolveUploadRoute({ mode: "dual" }), { kind: "dual" });
  assert.deepEqual(resolveUploadRoute({ mode: "single" }), { kind: "single" });
});

test("resolveUploadRoute falls back to the selector entry when mode is absent", () => {
  assert.deepEqual(resolveUploadRoute({}), { kind: "selector" });
});
