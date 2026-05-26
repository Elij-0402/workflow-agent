import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asLLMClientError } from "@/lib/llm/errors";
import { executeVariantGeneration, ServiceError } from "@/lib/services/generation-service";
import { GenerateConfigSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  config: GenerateConfigSchema,
});

const GENERATE_GENERIC_FAILURE = "生成失败，请稍后重试。";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "请先登录。" }, { status: 401 });
  }

  let parsedBody: z.infer<typeof requestSchema>;
  try {
    parsedBody = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "请求参数不正确。" }, { status: 400 });
  }

  try {
    const result = await executeVariantGeneration(supabase, {
      sessionId: parsedBody.sessionId,
      config: parsedBody.config,
      userId: user.id,
    });

    return NextResponse.json({
      ok: true,
      variantId: result.variantId,
      title: result.title,
      wordCount: result.wordCount,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const clientError = asLLMClientError(error, {
      code: "llm_request_failed",
      userMessage: GENERATE_GENERIC_FAILURE,
      retryable: true,
    });

    return NextResponse.json({ error: clientError }, { status: 502 });
  }
}
