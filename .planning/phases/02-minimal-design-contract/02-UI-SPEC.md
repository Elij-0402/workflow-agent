# NovelFusion AI — UI Design Specification

**Status:** Approved — 2026-05-26  
**Phase:** 02-minimal-design-contract  
**Requirements:** AUD-03, IA-01

---

## § 设计原则

| 原则 | 说明 | Backlog |
|------|------|---------|
| 极度克制 | 每个像素服务信息层级或状态 | #1–2 面板密度 |
| 大留白 | 页面级纵向节奏 ≥40px | #2、#7 |
| 一屏一焦点 | 每视口最多 1 个主 CTA | #9–11 |

---

## § 明/暗策略 (AUD-03)

**决策：dark-only（本里程碑锁定深色唯一）**

| MUST | 说明 |
|------|------|
| 保持 | `html { color-scheme: dark; }` |
| 禁止 | 未更新本 SPEC 前引入 `light` class 或第二套浅色 `:root` |

**理由：** (1) v0.3 全站 Atelier 暗底；(2) P0 审计评密度非缺浅色；(3) 双主题使 Phase 3–4 工作量翻倍。

**Appendix: Future light theme** — 扩展时使用 `--background-light` 等命名；**不排进本里程碑**。

---

## § Color roles

| Token | HSL | 角色 | 60/30/10 |
|-------|-----|------|----------|
| `--background` | 224 28% 8% | 页面底色 | 背景层 |
| `--foreground` | 210 20% 94% | 主文字 | 正文 ≥70% |
| `--muted-foreground` | 218 12% 66% | 次文字 | 结构 ~20% |
| `--card` | 224 24% 11% | 面板 | 结构 |
| `--primary` | 238 79% 67% | 品牌·**单 CTA** | ≤5% |
| `--destructive` | 8 56% 51% | 破坏性 | ≤1% |
| `--info` | 200 70% 55% | 进行中 | 状态 |
| `--warning` | 38 90% 55% | 注意 | 状态 |
| `--flash` | 154 45% 48% | 成功/已锁定 | 状态 |
| `--locked` | 132 23% 54% | 蓝图锁定 | 状态 |
| `--blocked` | 8 30% 45% | 阻断 | 状态 |

**60/30/10：** 背景+正文 ≥85%；muted 结构 ≤10%；`primary` 仅主 CTA Button。

**CTA：** 次级 `outline`/`ghost`；破坏性 `destructive`；链接不用 `text-primary` 装饰。

---

## § Typography

| 语义 | Utility | 规格 | 边界 |
|------|---------|------|------|
| display | `.type-display` | ~20–22px, chinese-display | 页面唯一主标题；`font-display italic` 仅此处 |
| title | `.type-title` | ~16–18px semibold sans | 区块标题 |
| body | `.type-body` | 14px sans | 正文 |
| caption | `.type-caption` | 12–13px muted | 辅助 |
| mono-label | `.type-mono-label` | 10–11px mono muted | 眉标；**禁止** primary |

**禁止：** `(app)/**` 新增 `text-[Npx]`。`data-label` → `text-muted-foreground`。

**Tailwind 对照：** `space-y-6`（24px）同级；`space-y-10`（40px）大段分隔。

---

## § Spacing

| Token | rem | px | Tailwind 对照 |
|-------|-----|-----|---------------|
| `--space-1` | 0.5rem | 8px | gap-2 |
| `--space-2` | 1rem | 16px | gap-4 |
| `--space-3` | 1.5rem | 24px | gap-6 / space-y-6 |
| `--space-4` | 2rem | 32px | gap-8 |
| `--space-5` | 2.5rem | 40px | gap-10 / space-y-10 |
| `--space-6` | 3rem | 48px | gap-12 |

- `.app-page` 主列：`gap-10`（40px）
- 禁止产品路由 `gap-4` 密堆多 panel

---

## § Surfaces

| Utility | 用途 | 规则 |
|---------|------|------|
| `surface-panel` | 一级容器 | 1px border，`shadow-none` |
| `surface-subtle` | 二级辅助 | 同屏 ≤1 主 + 1 subtle |
| `surface-locked` | 锁定态 | 虚线边框 |

**圆角：** `rounded-[var(--radius-md)]` = **5px**

**步骤页脚：** sticky footer 或 PipelineBar 附属；**不**另包 `surface-panel`（Phase 4 实现）。

---

## § Shadows & radius

- 内容区 panel：**shadow-none**
- Dialog / Sheet / Dropdown：允许轻微 shadow
- `--radius-md`: 5px

---

## § Migration inventory

| 文件 | Phase 4 债务 |
|------|----------------|
| `workbench-client.tsx` | 41× `text-[Npx]`、panel 密度、amber/sky → info/warning |
| `sessions/page.tsx` | 列表 panel 密度 |

---

## Alignment checklist

- [x] globals `:root` 含 `--space-1`、`--info`、`--warning`
- [x] `theme-tokens.ts` 含 `info`、`warning`
- [x] SPEC 表与 globals HSL 一致
- [x] `/design-system` 展示 spacing、type、info/warning

---

## Phase 2 验收清单

- [x] UI-SPEC 定义间距、字号、色彩、边框/阴影/卡片（ROADMAP SC1）
- [x] 明/暗策略书面决策与审计一致（ROADMAP SC2 / AUD-03）
- [x] design-system 与 token 对齐（ROADMAP SC3 / IA-01）

---

## Decision traceability

| ID | SPEC 章节 |
|----|-----------|
| D-01 | § 明/暗 — dark-only |
| D-02 | § 明/暗 — 理由三条 |
| D-03 | Appendix: Future light theme |
| D-04 | § 明/暗 — color-scheme: dark |
| D-05 | § Spacing — 8px grid, app-page gap-10 |
| D-06 | § Spacing — space-y-6 / space-y-10 |
| D-07 | § Migration — 禁任意 min-h/w |
| D-08 | § Surfaces — 1+1 panel |
| D-09 | § Spacing — --space-* |
| D-10 | § Typography — 五级 |
| D-11 | § Typography — 禁 text-[Npx] |
| D-12 | § Typography — display 边界 |
| D-13 | § Typography — data-label muted |
| D-14 | § Surfaces — 扁平 border |
| D-15 | § Shadows — overlay-only |
| D-16 | § Shadows — radius-md 5px |
| D-17 | § Surfaces — 步骤页脚 |
| D-18 | § Color — 60/30/10 |
| D-19 | § Color — CTA 变体 |
| D-20 | § Color — info/warning |
| D-21 | § Color — flash/locked/blocked |
| D-22 | 文首 — SPEC→globals→design-system |
| D-23 | Phase 2 plans 02-01/02-02 |
| D-24 | design-system 页脚 dev-only |
| D-25 | § Migration — 禁局部补丁 |
