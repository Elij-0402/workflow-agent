import { THEME_BACKGROUND_HSL } from "@/lib/theme-tokens";

const FALLBACK_BACKGROUND = THEME_BACKGROUND_HSL;

export const appBackgroundColor = () => `hsl(${THEME_BACKGROUND_HSL})`;

/** Resolves a root CSS HSL token (space-separated components) to `hsl(...)`. */
export function cssHslVar(token: string, fallback = FALLBACK_BACKGROUND): string {
  if (typeof document === "undefined") {
    return `hsl(${fallback})`;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  return raw ? `hsl(${raw})` : `hsl(${fallback})`;
}

export function appBackgroundColorFromDom(): string {
  return cssHslVar("--background");
}
