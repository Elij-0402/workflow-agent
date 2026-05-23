export function resolveStreamCompletionState(params: {
  receivedDone: boolean;
  receivedError: boolean;
}): "done" | "error" | "interrupted" {
  if (params.receivedDone) return "done";
  if (params.receivedError) return "error";
  return "interrupted";
}
