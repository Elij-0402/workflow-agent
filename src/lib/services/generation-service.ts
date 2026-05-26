import type { SupabaseClient } from "@supabase/supabase-js";
import { runLLMObject } from "@/lib/llm/runtime";
import { assertWithinRateLimit } from "@/lib/rate-limit";
import {
  buildGenerateUserPrompt,
  GENERATE_SYSTEM_PROMPT,
  GENERATE_PROMPT_VERSION,
  GENERATE_SCHEMA_VERSION,
  GENERATE_TEXT_CHAR_LIMIT,
  GENERATE_TITLE_FALLBACK,
  scopeToMaxTokens,
} from "@/lib/prompts/generate";
import { loadActiveSession } from "@/lib/sessions/guard";
import {
  getSessionStatusAfterGenerateFailure,
  getSessionStatusAfterGenerateSuccess,
  shouldEnterGeneratingStatus,
} from "@/lib/session-status";
import { countWords } from "@/lib/text/clean";
import { SessionStateMachine } from "@/lib/sessions/state-machine";
import {
  ANALYSIS_DIMENSIONS,
  CharactersResultSchema,
  NarrativeResultSchema,
  WorldviewResultSchema,
  type AnalysisDimension,
  type GenerateAnalyses,
  type GenerateConfig,
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

export type VariantGenerationRequest = {
  sessionId: string;
  config: GenerateConfig;
  userId: string;
};

function parseAnalyses(
  rows: Array<{ dimension: AnalysisDimension; result: unknown }>,
): GenerateAnalyses | null {
  const byDimension = new Map(rows.map((row) => [row.dimension, row.result]));

  const worldview = WorldviewResultSchema.safeParse(byDimension.get("worldview"));
  const characters = CharactersResultSchema.safeParse(byDimension.get("characters"));
  const narrative = NarrativeResultSchema.safeParse(byDimension.get("narrative"));

  if (!worldview.success || !characters.success || !narrative.success) {
    return null;
  }

  return {
    worldview: worldview.data,
    characters: characters.data,
    narrative: narrative.data,
  };
}

/**
 * 单书变体小说流式生成业务服务编排层。
 * 屏蔽 HTTP 上下文，提供事务保护、高可配置性及状态自动回滚机制。
 */
export async function executeVariantGeneration(
  supabase: SupabaseClient<Database>,
  req: VariantGenerationRequest,
) {
  // 1. 加载活跃会话并进行前置状态判断
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
    throw new ServiceError("双书任务请使用蓝图生成入口。", 409);
  }

  if (session.status !== "analyzed" && session.status !== "done") {
    throw new ServiceError("请先完成三维度分析。", 409);
  }

  // 2. 加载书籍文本内容
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id, cleaned_content")
    .eq("session_id", session.id)
    .eq("user_id", req.userId)
    .maybeSingle();

  if (bookError) {
    throw new ServiceError("读取书籍内容失败，请稍后再试。", 500);
  }

  if (!book?.cleaned_content?.trim()) {
    throw new ServiceError("当前书籍内容不可用。", 400);
  }

  // 3. 读取并解析历史分析维度与变体总数
  const [
    { data: analyses, error: analysesError },
    { count: variantCount, error: variantCountError },
  ] = await Promise.all([
    supabase
      .from("analyses")
      .select("dimension, result")
      .eq("user_id", req.userId)
      .eq("book_id", book.id),
    supabase
      .from("variants")
      .select("*", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("user_id", req.userId),
  ]);

  if (analysesError) {
    throw new ServiceError("读取分析结果失败，请稍后再试。", 500);
  }

  if (variantCountError) {
    throw new ServiceError("读取变体列表失败，请稍后再试。", 500);
  }

  if ((analyses?.length ?? 0) !== ANALYSIS_DIMENSIONS.length) {
    throw new ServiceError("请先完成三维度分析。", 409);
  }

  const parsedAnalyses = parseAnalyses(
    (analyses ?? []) as Array<{
      dimension: AnalysisDimension;
      result: unknown;
    }>,
  );

  if (!parsedAnalyses) {
    throw new ServiceError("请先完成三维度分析并确保分析结构完好。", 409);
  }

  const excerpt = book.cleaned_content.slice(0, GENERATE_TEXT_CHAR_LIMIT);
  const existingVariantCount = variantCount ?? 0;

  // 4. 初始化状态机与相关变量
  const stateMachine = new SessionStateMachine(supabase, session.id, req.userId);
  let variantCreated = false;

  const transitionalStatus = shouldEnterGeneratingStatus(session.status)
    ? "generating"
    : session.status;

  const result = await stateMachine.wrapTransition(
    transitionalStatus,
    async () => {
      // 成功状态决策器
      return getSessionStatusAfterGenerateSuccess();
    },
    // 失败状态决策器（wrapTransition 的失败回滚参数是固定的，所以我们需要预先算好如果生成失败，需要回滚到哪个状态）
    // 如果生成前已经有变体，或者任务保存变体成功后才在后续流程报错，我们应回到 'done' 状态，否则回滚到 'analyzed'。
    getSessionStatusAfterGenerateFailure(existingVariantCount),
    async () => {
      // 5. 限流自查
      const rateLimit = await assertWithinRateLimit(supabase, req.userId);
      if (!rateLimit.ok) {
        throw new ServiceError(rateLimit.message, rateLimit.status);
      }

      // 6. 拼装 Prompt 并运行模型
      const prompt = buildGenerateUserPrompt({
        analyses: parsedAnalyses,
        config: req.config,
        excerpt,
      });

      const llmResult = await runLLMObject({
        supabase,
        route: "/api/generate",
        operation: "generate_variant",
        schema: VariantResultSchema,
        system: GENERATE_SYSTEM_PROMPT,
        prompt,
        promptVersion: GENERATE_PROMPT_VERSION,
        schemaVersion: GENERATE_SCHEMA_VERSION,
        maxTokens: scopeToMaxTokens(req.config.output_scope),
        cacheSeed: {
          sessionId: session.id,
          analyses: parsedAnalyses,
          config: req.config,
          excerpt,
        },
      });

      const { object } = llmResult;
      const title = object.title.trim() || GENERATE_TITLE_FALLBACK;
      const content = object.content.trim();

      if (!content) {
        throw new ServiceError("生成失败，模型未输出任何有效小说变体。", 502);
      }

      const wordCount = countWords(content);

      // 7. 保存生成的变体实体数据
      const { data: insertedVariant, error: insertError } = await supabase
        .from("variants")
        .insert({
          session_id: session.id,
          user_id: req.userId,
          title,
          config: req.config,
          content,
          word_count: wordCount,
          llm_config_id: llmResult.llm.configId,
          prompt_version: GENERATE_PROMPT_VERSION,
          schema_version: GENERATE_SCHEMA_VERSION,
          prompt_tokens: llmResult.usage.promptTokens,
          completion_tokens: llmResult.usage.completionTokens,
          estimated_cost_cny: llmResult.estimatedCostCNY,
          cache_key: llmResult.cacheKey,
        })
        .select("id")
        .single();

      if (insertError || !insertedVariant) {
        throw new ServiceError("保存小说变体失败，请稍后再试。", 500);
      }

      variantCreated = true;

      return {
        variantId: insertedVariant.id,
        title,
        wordCount,
      };
    },
  ).catch(async (err) => {
    // 捕获任务执行过程中的错误。
    // 如果大模型生成成功并在 variants.insert 写入时失败，我们在 catch 处需要确保正确做 session 回滚。
    // 如果变体在最后一秒保存成功，但在 Done 触发时由于 RLS/网络故障断开，需要精确判定最终回滚目标
    if (variantCreated) {
      // 救砖处理：由于变体其实已经成功插入了，即便抛出异常，状态实际上应该置为 'done' 而不是 analyzed
      try {
        await supabase
          .from("sessions")
          .update({ status: "done", updated_at: new Date().toISOString() })
          .eq("id", session.id)
          .eq("user_id", req.userId);
      } catch (e) {
        console.error("生成异常后修正会话状态失败:", e);
      }
    }
    throw err;
  });

  return result;
}
