import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBookAnalysisBlockingReason,
  getBookProviderCompatibility,
  resolveBookAnalysisView,
} from "@/lib/books/content";
import { saveAnalysis } from "@/lib/analysis-store";
import { runLLMObject } from "@/lib/llm/runtime";
import { assertWithinRateLimit } from "@/lib/rate-limit";
import { getUserLLMClient } from "@/lib/llm/dispatch";
import {
  ANALYSIS_TEXT_CHAR_LIMIT,
  ANALYSIS_DIMENSION_CONFIG,
} from "@/lib/prompts";
import { wrapUntrustedNovel } from "@/lib/prompts/safety";
import { loadActiveSession } from "@/lib/sessions/guard";
import {
  getSessionStatusAfterAnalysis,
  shouldEnterAnalyzingStatus,
} from "@/lib/session-status";
import { SessionStateMachine } from "@/lib/sessions/state-machine";
import {
  LEGACY_ANALYSIS_DIMENSIONS,
  type LegacyAnalysisDimension,
  type Database,
} from "@/lib/types";

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export type BookAnalysisRequest = {
  sessionId: string;
  dimension: LegacyAnalysisDimension;
  userId: string;
};

/**
 * 核心单书分析业务服务编排器。
 * 剥离了 HTTP 契约，专职编排状态机、LLM 运行、Rate Limit 校验以及分析数据持久化。
 */
export async function executeBookAnalysis(
  supabase: SupabaseClient<Database>,
  req: BookAnalysisRequest,
) {
  // 1. 加载活跃会话并进行前置性检查
  const { session, guard } = await loadActiveSession(
    supabase,
    req.sessionId,
    req.userId,
  );
  if (!guard.ok) {
    throw new ServiceError(guard.message, guard.status);
  }
  if (!session) {
    throw new ServiceError("未找到对应会话。", 404);
  }

  if (session.mode === "dual") {
    throw new ServiceError("双书任务请使用工作台的章节分析入口。", 409);
  }

  if (session.status === "generating") {
    throw new ServiceError("当前正在生成，暂不可重新分析。", 409);
  }

  // 2. 读取关联的书籍数据
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, cleaned_content, metadata, storage_path")
    .eq("session_id", session.id)
    .eq("user_id", req.userId)
    .maybeSingle();

  if (bookError) {
    throw new ServiceError("读取书籍内容失败，请稍后再试。", 500);
  }

  if (!book) {
    throw new ServiceError("当前书籍内容不可用。", 400);
  }

  // 3. 内容与模型提供商安全性兼容性校验
  const blockingReason = getBookAnalysisBlockingReason(book.metadata);
  if (blockingReason) {
    throw new ServiceError(blockingReason, 409);
  }

  const llm = await getUserLLMClient(supabase);
  const providerCompatibility = getBookProviderCompatibility(
    book.metadata,
    llm.provider,
  );
  if (providerCompatibility.status === "incompatible") {
    throw new ServiceError(
      providerCompatibility.reason ?? "当前模型不兼容该内容类型，请切换模型后再试。",
      409,
    );
  }

  // 4. 加载并截取文本视图
  const promptConfig = ANALYSIS_DIMENSION_CONFIG[req.dimension];
  const analysisView = await resolveBookAnalysisView(supabase, book);
  if (!analysisView) {
    throw new ServiceError("当前书籍内容不可用。", 400);
  }
  const excerpt = analysisView.slice(0, ANALYSIS_TEXT_CHAR_LIMIT);

  // 5. 初始化状态转换机，并开启事务级保护
  const stateMachine = new SessionStateMachine(supabase, session.id, req.userId);

  const transitionalStatus = shouldEnterAnalyzingStatus(session.status)
    ? "analyzing"
    : session.status;

  const result = await stateMachine.wrapTransition(
    transitionalStatus,
    async () => {
      // 成功状态决策器：查询分析数量与变体数量，计算最终跃迁状态
      const [
        { count: analysisCount, error: analysisCountError },
        { count: variantCount, error: variantCountError },
      ] = await Promise.all([
        supabase
          .from("analyses")
          .select("*", { count: "exact", head: true })
          .eq("book_id", book.id)
          .eq("user_id", req.userId),
        supabase
          .from("variants")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id)
          .eq("user_id", req.userId),
      ]);

      if (analysisCountError || variantCountError) {
        throw new ServiceError("计算会话新状态失败，请稍后再试。", 500);
      }

      return getSessionStatusAfterAnalysis({
        analysisCount: analysisCount ?? 0,
        totalAnalyses: LEGACY_ANALYSIS_DIMENSIONS.length,
        variantCount: variantCount ?? 0,
      });
    },
    "uploaded", // 失败后自动回滚至兜底状态
    async () => {
      // 6. 执行核心分析子任务 (限流检查 + LLM 调用 + 结果入库)
      const rateLimit = await assertWithinRateLimit(supabase, req.userId);
      if (!rateLimit.ok) {
        throw new ServiceError(rateLimit.message, rateLimit.status);
      }

      const llmResult = await runLLMObject({
        supabase,
        route: "/api/analyze",
        operation: `analysis:${req.dimension}`,
        schema: promptConfig.schema,
        system: promptConfig.systemPrompt,
        prompt: wrapUntrustedNovel(excerpt),
        promptVersion: promptConfig.promptVersion,
        schemaVersion: promptConfig.schemaVersion,
        cacheSeed: {
          bookId: book.id,
          dimension: req.dimension,
          excerpt,
        },
      });

      const { error: upsertError } = await saveAnalysis({
        supabase,
        userId: req.userId,
        bookId: book.id,
        scope: "book",
        dimension: req.dimension,
        result: llmResult.object,
        llmConfigId: llmResult.llm.configId,
        promptTokens: llmResult.usage.promptTokens,
        completionTokens: llmResult.usage.completionTokens,
        promptVersion: promptConfig.promptVersion,
        schemaVersion: promptConfig.schemaVersion,
        estimatedCostCNY: llmResult.estimatedCostCNY,
        cacheKey: llmResult.cacheKey,
      });

      if (upsertError) {
        throw new ServiceError("保存分析结果失败，请稍后再试。", 500);
      }

      return {
        dimension: req.dimension,
        result: llmResult.object,
      };
    },
  );

  return result;
}
