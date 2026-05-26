import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { asLLMClientError } from "@/lib/llm/errors";
import { executeBookAnalysis, ServiceError } from "@/lib/services/analysis-service";
import {
  LEGACY_ANALYSIS_DIMENSIONS,
  type LegacyAnalysisDimension,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  dimension: z.enum(
    LEGACY_ANALYSIS_DIMENSIONS as readonly [
      LegacyAnalysisDimension,
      ...LegacyAnalysisDimension[],
    ],
  ),
});

const ANALYSIS_GENERIC_FAILURE = "分析失败，请稍后重试。";

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
    const result = await executeBookAnalysis(supabase, {
      sessionId: parsedBody.sessionId,
      dimension: parsedBody.dimension,
      userId: user.id,
    });

    return NextResponse.json({
      ok: true,
      dimension: result.dimension,
      result: result.result,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const clientError = asLLMClientError(error, {
      code: "llm_request_failed",
      userMessage: ANALYSIS_GENERIC_FAILURE,
      retryable: true,
    });

    return NextResponse.json(
      { error: clientError },
      {
        status:
          clientError.userMessage === ANALYSIS_GENERIC_FAILURE ? 500 : 409,
      },
    );
  }
}
