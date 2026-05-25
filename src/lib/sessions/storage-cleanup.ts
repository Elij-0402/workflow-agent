import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

const STORAGE_REMOVE_BATCH = 500;

export async function collectSessionStoragePaths(
  supabase: SupabaseClient<Database>,
  sessionIds: string[],
  userId: string,
): Promise<string[]> {
  if (sessionIds.length === 0) return [];

  const { data: books } = await supabase
    .from("books")
    .select("storage_path, metadata")
    .in("session_id", sessionIds)
    .eq("user_id", userId);

  const paths = new Set<string>();
  for (const book of books ?? []) {
    if (typeof book.storage_path === "string" && book.storage_path) {
      paths.add(book.storage_path);
    }
    const cleaned = (book.metadata as { cleaned_storage_path?: unknown })
      ?.cleaned_storage_path;
    if (typeof cleaned === "string" && cleaned) {
      paths.add(cleaned);
    }
  }
  return Array.from(paths);
}

export async function removeStorageObjects(
  supabase: SupabaseClient<Database>,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  for (let i = 0; i < paths.length; i += STORAGE_REMOVE_BATCH) {
    const batch = paths.slice(i, i + STORAGE_REMOVE_BATCH);
    const { error } = await supabase.storage.from("novels").remove(batch);
    if (error) {
      console.error("[storage-cleanup] remove batch failed:", {
        count: batch.length,
        message: error.message,
      });
    }
  }
}

export async function deleteSessionStorageObjects(
  supabase: SupabaseClient<Database>,
  sessionIds: string[],
  userId: string,
) {
  const paths = await collectSessionStoragePaths(supabase, sessionIds, userId);
  await removeStorageObjects(supabase, paths);
}
