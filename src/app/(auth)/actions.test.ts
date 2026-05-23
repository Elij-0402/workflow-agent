import test from "node:test";
import assert from "node:assert/strict";

import { getSafeRedirectPath } from "./actions";

test("getSafeRedirectPath keeps in-app routes", () => {
  const formData = new FormData();
  formData.set("redirect", "/sessions/123?step=compare");

  assert.equal(getSafeRedirectPath(formData), "/sessions/123?step=compare");
});

test("getSafeRedirectPath rejects external redirects", () => {
  const formData = new FormData();
  formData.set("redirect", "https://example.com");

  assert.equal(getSafeRedirectPath(formData), "/sessions");
});
