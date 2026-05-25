import assert from "node:assert/strict";
import test from "node:test";

import { assertWithinRateLimit } from "./rate-limit";

type MockQuery = {
  count: number | null;
  error: { message: string } | null;
};

function createMockSupabase(query: MockQuery) {
  const chain = {
    eq: () => chain,
    gte: () => chain,
    then(
      resolve: (value: {
        count: number | null;
        error: { message: string } | null;
      }) => void,
    ) {
      resolve({ count: query.count, error: query.error });
    },
  };
  return {
    from: () => ({
      select: () => chain,
    }),
  } as never;
}

test("assertWithinRateLimit allows requests under the cap", async () => {
  const result = await assertWithinRateLimit(
    createMockSupabase({ count: 5, error: null }),
    "user-1",
    {
      maxRequests: 10,
    },
  );
  assert.deepEqual(result, { ok: true });
});

test("assertWithinRateLimit rejects at the cap", async () => {
  const result = await assertWithinRateLimit(
    createMockSupabase({ count: 30, error: null }),
    "user-1",
    {
      maxRequests: 30,
    },
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 429);
    assert.match(result.message, /频繁/);
  }
});

test("assertWithinRateLimit surfaces query errors", async () => {
  const result = await assertWithinRateLimit(
    createMockSupabase({ count: null, error: { message: "db down" } }),
    "user-1",
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 500);
  }
});
