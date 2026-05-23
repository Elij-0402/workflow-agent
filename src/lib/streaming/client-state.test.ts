import test from "node:test";
import assert from "node:assert/strict";

import { resolveStreamCompletionState } from "./client-state";

test("resolveStreamCompletionState keeps explicit error instead of marking interrupted", () => {
  assert.equal(
    resolveStreamCompletionState({ receivedDone: false, receivedError: true }),
    "error",
  );
});

test("resolveStreamCompletionState marks interrupted only when neither done nor error arrived", () => {
  assert.equal(
    resolveStreamCompletionState({ receivedDone: false, receivedError: false }),
    "interrupted",
  );
  assert.equal(
    resolveStreamCompletionState({ receivedDone: true, receivedError: false }),
    "done",
  );
});
