import { toast } from "sonner";

import {
  getClientErrorActionLabel,
  getClientErrorMessage,
  type LLMClientError,
} from "@/lib/llm/errors";

type ErrorAction = { label: string; href: string };

const PATTERNS: Array<{ test: RegExp; action: ErrorAction }> = [
  { test: /api[\s_]?key/i, action: { label: "去设置", href: "/settings" } },
  {
    test: /鉴权|未授权|401|403/,
    action: { label: "去设置", href: "/settings" },
  },
  {
    test: /max[\s_]?tokens|token.{0,4}(超|过|长)/i,
    action: { label: "调整参数", href: "/settings" },
  },
  {
    test: /(请先|先在).{0,8}(设置|配置)/,
    action: { label: "去设置", href: "/settings" },
  },
];

function matchAction(message: string): ErrorAction | null {
  for (const { test, action } of PATTERNS) {
    if (test.test(message)) return action;
  }
  return null;
}

export function toastError(error: string | LLMClientError) {
  if (typeof error !== "string") {
    const actionLabel = getClientErrorActionLabel(error.action);
    if (actionLabel) {
      toast.error(error.userMessage, {
        action: {
          label: actionLabel,
          onClick: () => {
            if (typeof window === "undefined") return;
            if (error.action === "retry") {
              window.location.reload();
              return;
            }
            window.location.href = "/settings";
          },
        },
      });
      return;
    }

    toast.error(getClientErrorMessage(error));
    return;
  }

  const message = error;
  const action = matchAction(message);
  if (action) {
    toast.error(message, {
      action: {
        label: action.label,
        onClick: () => {
          if (typeof window !== "undefined") window.location.href = action.href;
        },
      },
    });
  } else {
    toast.error(message);
  }
}
