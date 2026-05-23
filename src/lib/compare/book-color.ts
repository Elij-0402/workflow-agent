export const BOOK_COLOR_COUNT = 6;

export function getBookColorVar(index: number): string {
  const slot =
    ((index % BOOK_COLOR_COUNT) + BOOK_COLOR_COUNT) % BOOK_COLOR_COUNT;
  return `var(--book-${slot + 1})`;
}

export function getBookColorHsl(index: number, alpha = 1): string {
  const v = getBookColorVar(index);
  return alpha === 1 ? `hsl(${v})` : `hsl(${v} / ${alpha})`;
}
