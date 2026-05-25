import assert from "node:assert/strict";
import test from "node:test";

import { rejectArchivedSession } from "./guard";

test("rejectArchivedSession returns 404 when session is null", () => {
  const result = rejectArchivedSession(null);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 404);
    assert.match(result.message, /未找到/);
  }
});

test("rejectArchivedSession blocks archived sessions", () => {
  const result = rejectArchivedSession({
    archived_at: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 409);
    assert.match(result.message, /归档/);
  }
});

test("rejectArchivedSession allows active sessions", () => {
  assert.deepEqual(rejectArchivedSession({ archived_at: null }), { ok: true });
  assert.deepEqual(rejectArchivedSession({}), { ok: true });
});
