import assert from "node:assert/strict";
import test from "node:test";

import { SessionStateMachine } from "./state-machine";
import type { SessionStatus } from "@/lib/types";

test("SessionStateMachine transitionTo 成功更新状态", async () => {
  let updatePayload: any = null;
  const mockSupabase: any = {
    from: (table: string) => {
      assert.equal(table, "sessions");
      return {
        update: (payload: any) => {
          updatePayload = payload;
          return {
            eq: (col1: string, val1: any) => {
              assert.equal(col1, "id");
              assert.equal(val1, "session-123");
              return {
                eq: (col2: string, val2: any) => {
                  assert.equal(col2, "user_id");
                  assert.equal(val2, "user-456");
                  return {
                    in: (col3: string, val3: any) => {
                      assert.equal(col3, "status");
                      assert.deepEqual(val3, ["uploaded"]);
                      return {
                        select: () => ({
                          maybeSingle: async () => ({
                            data: { id: "session-123", status: "analyzing" },
                            error: null,
                          }),
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const fsm = new SessionStateMachine(mockSupabase, "session-123", "user-456");
  await fsm.transitionTo("uploaded", "analyzing");
  assert.equal(updatePayload.status, "analyzing");
  assert.ok(updatePayload.updated_at);
});

test("SessionStateMachine transitionTo 在前置状态不匹配时抛出错误", async () => {
  const mockSupabase: any = {
    from: () => ({
      update: () => ({
        eq: () => ({
          eq: () => ({
            in: () => ({
              select: () => ({
                maybeSingle: async () => ({
                  data: null, // 未匹配到任何行（由于前置状态不匹配或会话不存在）
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  };

  const fsm = new SessionStateMachine(mockSupabase, "session-123", "user-456");
  await assert.rejects(
    fsm.transitionTo("uploaded", "analyzing"),
    /会话状态转换失败/,
  );
});

test("SessionStateMachine wrapTransition 成功时调用成功状态决策器并正确流转", async () => {
  let currentStatus: SessionStatus = "uploaded";
  let updatesCount = 0;

  const mockSupabase: any = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { status: currentStatus },
              error: null,
            }),
          }),
        }),
      }),
      update: (payload: any) => {
        updatesCount++;
        currentStatus = payload.status;
        return {
          eq: () => ({
            eq: () => ({
              in: () => ({
                select: () => ({
                  maybeSingle: async () => ({
                    data: { id: "session-123", status: currentStatus },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      },
    }),
  };

  const fsm = new SessionStateMachine(mockSupabase, "session-123", "user-456");
  const result = await fsm.wrapTransition(
    "analyzing",
    () => "analyzed",
    "uploaded",
    async () => "task-success-result",
  );

  assert.equal(result, "task-success-result");
  assert.equal(currentStatus, "analyzed");
  assert.equal(updatesCount, 2); // 两次转换：uploaded -> analyzing，然后 analyzing -> analyzed
});

test("SessionStateMachine wrapTransition 任务抛出异常时能回滚到兜底状态", async () => {
  let currentStatus: SessionStatus = "uploaded";
  let rollbackTriggered = false;

  const mockSupabase: any = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { status: currentStatus },
              error: null,
            }),
          }),
        }),
      }),
      update: (payload: any) => {
        currentStatus = payload.status;
        if (payload.status === "uploaded") {
          rollbackTriggered = true;
        }
        return {
          eq: () => ({
            eq: () => ({
              in: () => ({
                select: () => ({
                  maybeSingle: async () => ({
                    data: { id: "session-123", status: currentStatus },
                    error: null,
                  }),
                }),
              }),
              eq: (col: string, val: any) => {
                // 回滚时的 eq 链
                assert.ok(["id", "user_id", "status"].includes(col));
                return {
                  eq: () => ({
                    eq: () => Promise.resolve({ error: null }),
                  }),
                };
              },
            }),
          }),
        };
      },
    }),
  };

  const fsm = new SessionStateMachine(mockSupabase, "session-123", "user-456");

  await assert.rejects(
    fsm.wrapTransition(
      "analyzing",
      () => "analyzed",
      "uploaded",
      async () => {
        throw new Error("模型响应超时故障");
      },
    ),
    /模型响应超时故障/,
  );

  assert.ok(rollbackTriggered);
});
