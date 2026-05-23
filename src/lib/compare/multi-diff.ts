export type MultiwayTag = "common" | "majority" | "exclusive";

export type MultiwayEntry<T> = {
  key: string;
  items: T[];
  bookIndices: number[];
  tag: MultiwayTag;
};

export function multiwayTag<T>(
  perBook: T[][],
  keyOf: (item: T) => string,
): MultiwayEntry<T>[] {
  const n = perBook.length;
  if (n === 0) return [];
  const threshold = n <= 2 ? n : Math.ceil(n / 2);
  const map = new Map<string, MultiwayEntry<T>>();

  perBook.forEach((items, bookIndex) => {
    const seenInBook = new Set<string>();
    for (const item of items) {
      const key = keyOf(item)?.toString().trim().toLowerCase();
      if (!key) continue;
      if (seenInBook.has(key)) continue;
      seenInBook.add(key);
      const existing = map.get(key);
      if (existing) {
        existing.items.push(item);
        existing.bookIndices.push(bookIndex);
      } else {
        map.set(key, {
          key,
          items: [item],
          bookIndices: [bookIndex],
          tag: "exclusive",
        });
      }
    }
  });

  for (const entry of map.values()) {
    const count = entry.bookIndices.length;
    entry.tag =
      count === n ? "common" : count >= threshold ? "majority" : "exclusive";
  }

  return [...map.values()];
}

export function pickByTag<T>(
  entries: MultiwayEntry<T>[],
  tag: MultiwayTag | "any",
): MultiwayEntry<T>[] {
  if (tag === "any") return entries;
  return entries.filter((e) => e.tag === tag);
}
