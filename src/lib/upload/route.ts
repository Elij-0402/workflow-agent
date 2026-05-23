export function resolveUploadRoute(input: {
  mode?: string;
  sessionId?: string;
}) {
  if (input.sessionId) {
    return { kind: "supplement" as const };
  }

  if (input.mode === "dual") {
    return { kind: "dual" as const };
  }

  if (input.mode === "single") {
    return { kind: "single" as const };
  }

  return { kind: "selector" as const };
}
