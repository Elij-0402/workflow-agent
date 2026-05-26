import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SessionStatus } from "@/lib/types";

export class SessionStateMachine {
  constructor(
    private supabase: SupabaseClient<Database>,
    private sessionId: string,
    private userId: string,
  ) {}

  /**
   * 将会话状态从合法前置状态迁移到目标状态。
   * 使用 SQL 条件更新确保状态机流转的幂等性与防止并发修改冲突。
   */
  async transitionTo(
    from: SessionStatus | SessionStatus[],
    to: SessionStatus,
  ): Promise<void> {
    const allowedSources = Array.isArray(from) ? from : [from];

    // 更新条件中强匹配前置状态，防止并发冲突
    const { data, error } = await this.supabase
      .from("sessions")
      .update({ status: to, updated_at: new Date().toISOString() })
      .eq("id", this.sessionId)
      .eq("user_id", this.userId)
      .in("status", allowedSources)
      .select("id, status")
      .maybeSingle();

    if (error) {
      throw new Error(`更新会话状态失败: ${error.message}`);
    }

    if (!data) {
      throw new Error(
        `会话状态转换失败: 无法将状态从 [${allowedSources.join(", ")}] 跃迁至 "${to}"。会话可能不存在或已被并发进程修改。`,
      );
    }
  }

  /**
   * 状态事务保护器：在执行一个可能失败的异步任务时，自动维护过渡状态及失败回滚。
   */
  async wrapTransition<T>(
    transitionalStatus: SessionStatus,
    successStatusDeterminer: () => Promise<SessionStatus> | SessionStatus,
    failureStatus: SessionStatus,
    task: () => Promise<T>,
  ): Promise<T> {
    // 1. 读取当前最新状态作为基准前置状态
    const { data: session, error: readError } = await this.supabase
      .from("sessions")
      .select("status")
      .eq("id", this.sessionId)
      .eq("user_id", this.userId)
      .maybeSingle();

    if (readError || !session) {
      throw new Error(`未找到会话或读取状态失败，无法开启状态事务守护。`);
    }

    const originalStatus = session.status as SessionStatus;

    // 2. 将状态跃迁到过渡状态（如 uploading -> analyzing）
    await this.transitionTo(originalStatus, transitionalStatus);

    try {
      // 3. 执行核心业务逻辑
      const result = await task();

      // 4. 执行成功，确定目标状态并跃迁
      const nextStatus = await successStatusDeterminer();
      await this.transitionTo(transitionalStatus, nextStatus);

      return result;
    } catch (err) {
      // 5. 执行失败，自动回滚至兜底错误状态
      try {
        await this.supabase
          .from("sessions")
          .update({ status: failureStatus, updated_at: new Date().toISOString() })
          .eq("id", this.sessionId)
          .eq("user_id", this.userId)
          .eq("status", transitionalStatus); // 仅在过渡态未被篡改时进行回滚
      } catch (rollbackErr) {
        console.error("状态回滚失败:", rollbackErr);
      }
      throw err;
    }
  }
}
