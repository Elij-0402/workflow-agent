export type SessionListItem = {
  id: string;
  name: string;
  status: string;
  mode: "single" | "dual" | string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export function groupSessionsByMode<T extends { mode: string }>(sessions: T[]) {
  const dual: T[] = [];
  const single: T[] = [];

  for (const session of sessions) {
    if (session.mode === "dual") {
      dual.push(session);
    } else {
      single.push(session);
    }
  }

  return { dual, single };
}
