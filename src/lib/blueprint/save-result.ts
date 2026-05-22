export function toBlueprintSaveResult(row: { id: string | null; updated_at: string | null }) {
  if (!row.id || !row.updated_at) {
    throw new Error("蓝图保存结果不完整。");
  }

  return {
    ok: true as const,
    id: row.id,
    updated_at: row.updated_at,
  };
}
