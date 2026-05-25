# NovelFusion AI — UI Design Specification

**Status:** Draft — pending 02-02 review  
**Phase:** 02-minimal-design-contract  
**Requirements:** AUD-03, IA-01

---

## § 设计原则

| 原则 | 说明 | Backlog 映射 |
|------|------|----------------|
| 极度克制 | 每个像素服务信息层级或状态，不为氛围装饰 | #1–2 面板密度 |
| 大留白 | 页面级纵向节奏 ≥40px；区块用留白分隔 | #2、#7 |
| 一屏一焦点 | 每视口最多 1 个主 CTA（`primary` Button） | #9–11 字号/CTA |

---

## § 明/暗策略 (AUD-03)

**决策：dark-only（本里程碑锁定深色唯一）**

| MUST | 说明 |
|------|------|
| 保持 | `html { color-scheme: dark; }` |
| 禁止 | 在未更新本 SPEC 前引入 `light` class 或第二套 `:root` 浅色 token |

**理由（D-02）：**

1. v0.3 已全站 Atelier 暗底，`globals.css` 仅暗色 `:root`
2. P0 审计在现有暗色上评密度/层级，非「缺浅色」
3. 双主题使 Phase 3–4 工作量翻倍

**未来浅色（D-03）：** 附录占位 — 扩展时采用 `--background-light` 等命名约定，**不排进本里程碑**。

---

## § Spacing

| Token | rem | px | 典型用途 |
|-------|-----|-----|----------|
| `--space-1` | 0.5rem | 8px | 紧凑内边距 |
| `--space-2` | 1rem | 16px | 控件间距 |
| `--space-3` | 1.5rem | 24px | `space-y-6` 同级内容 |
| `--space-4` | 2rem | 32px | 区块内分隔 |
| `--space-5` | 2.5rem | 40px | `.app-page` gap、`space-y-10` |
| `--space-6` | 3rem | 48px | 大段分隔 |

- `.app-page` 主列使用 `gap-10`（40px，对齐 D-05）
- 禁止产品路由新增 `gap-4` 密堆多 panel（D-06）

---

## § Typography

| 语义类 | CSS utility | 用途 |
|--------|-------------|------|
| display | `.type-display` | 页面唯一主标题（serif / chinese-display） |
| title | `.type-title` | 区块标题（sans semibold） |
| body | `.type-body` | 正文 14px |
| caption | `.type-caption` | 辅助说明 muted |
| mono-label | `.type-mono-label` | 眉标/数据标签，**禁止** `text-primary` |

**禁止：** `(app)/**` 新增 `text-[Npx]`（D-11）。`data-label` 使用 `text-muted-foreground`（D-13）。

---

## § Surfaces & CTA

| Surface | 用途 | 规则 |
|---------|------|------|
| `surface-panel` | 一级容器 | 1px border，**shadow-none**（D-15） |
| `surface-subtle` | 二级辅助 | 同屏最多 1 主 + 1 subtle（D-08） |
| `surface-locked` | 锁定态 | 虚线边框 |

**圆角：** panel 默认 `rounded-[var(--radius-md)]` = **5px**（D-16）

**60/30/10（D-18）：** 背景+正文 ≥85%；muted 结构 ≤10%；`primary` 仅主 CTA。

**CTA 变体（D-19）：** 次级 `outline`/`ghost`；破坏性 `destructive`；装饰不用 `text-primary`。

**语义色（D-20）：**

| Token | HSL | 角色 |
|-------|-----|------|
| `--info` | 200 70% 55% | 进行中 |
| `--warning` | 38 90% 55% | 非阻断注意 |

---

## § Color roles (draft)

| Token | 角色 |
|-------|------|
| `--primary` | 品牌·单 CTA |
| `--destructive` | 破坏性 |
| `--flash` / `--locked` / `--blocked` | 蓝图锁定态 |

---

## § Migration inventory

以下 P0 文件在 **Phase 4** 执行迁移（本阶段不改业务路由）：

| 文件 | 债务 |
|------|------|
| `src/app/(app)/sessions/[id]/workbench/workbench-client.tsx` | 41× `text-[Npx]`、panel 密度 |
| `src/app/(app)/sessions/page.tsx` | 列表 panel 密度 |
| workbench 内硬编码 amber/sky | 替换为 `--info`/`--warning` |

---

## § Shadows & radius

- 内容区 panel：**shadow-none**
- 仅 Dialog/Sheet/Dropdown 允许轻微 shadow（D-15）
- `--radius-md`: 5px
