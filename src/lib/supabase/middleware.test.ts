import test from "node:test";
import assert from "node:assert/strict";

import { buildLoginRedirectTarget } from "./middleware";

test("buildLoginRedirectTarget preserves query string", () => {
  assert.equal(
    buildLoginRedirectTarget("/sessions/123", "?step=compare&view=full"),
    "/sessions/123?step=compare&view=full",
  );
});

test("buildLoginRedirectTarget handles empty search", () => {
  assert.equal(buildLoginRedirectTarget("/sessions", ""), "/sessions");
});
