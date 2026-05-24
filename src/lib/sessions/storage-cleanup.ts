import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

export async function deleteSessionStorageObjects(
  supabase: SupabaseClient<Database>,
  sessionIds: string[],
  userId: string,
) {
  if (sessionIds.length === 0) return;

  const { data: books } = await supabase
    .from("books")
    .select("storage_path")
    .in("session_id", sessionIds)
    .eq("user_id", userId);

  const paths = (books ?? [])
    .map((book) => book.storage_path)
    .filter((path): path is string => Boolean(path));

  if (paths.length === 0) return;

  await supabase.storage.from("novels").remove(paths);
}
