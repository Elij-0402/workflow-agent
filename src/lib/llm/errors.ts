import { NextResponse } from "next/server";

import {
  LLM_BASE_URL_NOT_ALLOWED_MESSAGE,
  LLM_CONFIG_REQUIRED_MESSAGE,
  LLM_INCOMPATIBLE_BASE_URL_MESSAGE,
  LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE,
} from "@/lib/llm-config";

export type LLMErrorAction = "open_settings" | "retry" | "adjust_params";

export type LLMErrorCode =
  | "auth_required"
  | "bad_request"
  | "llm_config_required"
  | "llm_config_invalid"
  | "llm_api_key_invalid"
  | "llm_api_key_unreadable"
  | "llm_connection_failed"
  | "llm_models_unavailable"
  | "llm_provider_response_invalid"
  | "llm_timeout"
  | "llm_request_failed"
  | "llm_output_empty"
  | "llm_upstream_error"
  | "persistence_failed"
  | "session_state_conflict"
  | "internal_error";

export type LLMClientError = {
  code: LLMErrorCode;
  userMessage: string;
  retryable: boolean;
  action?: LLMErrorAction;
  providerStatus?: number;
};

export class LLMError extends Error {
  readonly code: LLMErrorCode;
  readonly retryable: boolean;
  readonly action?: LLMErrorAction;
  readonly providerStatus?: number;
  readonly status: number;

  constructor(
    client: LLMClientError,
    status = 500,
  ) {
    super(client.userMessage);
    this.name = "LLMError";
    this.code = client.code;
    this.retryable = client.retryable;
    this.action = client.action;
    this.providerStatus = client.providerStatus;
    this.status = status;
  }

  toClientError(): LLMClientError {
    return {
      code: this.code,
      userMessage: this.message,
      retryable: this.retryable,
      action: this.action,
      providerStatus: this.providerStatus,
    };
  }
}

export function jsonClientError(error: LLMClientError, status = 500) {
  return NextResponse.json({ error }, { status });
}

export function getClientErrorMessage(error: string | LLMClientError) {
  return typeof error === "string" ? error : error.userMessage;
}

export function getClientErrorActionLabel(action?: LLMErrorAction) {
  if (action === "open_settings") return "去设置";
  if (action === "adjust_params") return "调整参数";
  if (action === "retry") return "重试";
  return null;
}

export function asLLMClientError(
  error: unknown,
  fallback: LLMClientError = {
    code: "internal_error",
    userMessage: "请求失败，请稍后重试。",
    retryable: true,
  },
): LLMClientError {
  if (error instanceof LLMError) return error.toClientError();

  if (
    error instanceof Error &&
    [
      LLM_CONFIG_REQUIRED_MESSAGE,
      LLM_INCOMPATIBLE_BASE_URL_MESSAGE,
      LLM_BASE_URL_NOT_ALLOWED_MESSAGE,
      LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE,
    ].includes(error.message)
  ) {
    if (error.message === LLM_SAVED_API_KEY_DECRYPT_FAILED_MESSAGE) {
      return {
        code: "llm_api_key_unreadable",
        userMessage: error.message,
        retryable: false,
        action: "open_settings",
      };
    }
    return {
      code: "llm_config_invalid",
      userMessage:
        error.message === LLM_CONFIG_REQUIRED_MESSAGE ? LLM_CONFIG_REQUIRED_MESSAGE : error.message,
      retryable: false,
      action: "open_settings",
    };
  }

  return fallback;
}
