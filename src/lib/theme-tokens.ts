/** Keep in sync with `src/app/globals.css` `:root` tokens. */

export const THEME_BACKGROUND_HSL = "224 28% 8%";

export type ColorToken = {
  name: string;
  value: string;
  role: string;
};

export const COLOR_TOKENS: ColorToken[] = [
  { name: "background", value: THEME_BACKGROUND_HSL, role: "页面底色" },
  { name: "card", value: "224 24% 11%", role: "卡片/面板" },
  { name: "muted", value: "224 22% 13%", role: "次级背景" },
  { name: "accent", value: "224 20% 16%", role: "hover 高亮" },
  { name: "border", value: "224 16% 22%", role: "细边框" },
  { name: "foreground", value: "210 20% 94%", role: "主文字 (≥70%)" },
  { name: "muted-foreground", value: "218 12% 66%", role: "次文字 (~20%)" },
  { name: "primary", value: "238 79% 67%", role: "品牌·CTA (≤5%)" },
  { name: "destructive", value: "8 56% 51%", role: "破坏性操作 (≤1%)" },
  { name: "flash", value: "154 45% 48%", role: "成功/已锁定" },
];
