# Phase 2: 极简设计契约 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 2-极简设计契约
**Areas discussed:** 明/暗色策略, 间距与留白尺度, 字号阶梯与任意 px, 卡片/边框/阴影, 主色与 CTA/状态色, SPEC 与 design-system 落地顺序
**Mode:** User requested all areas + delegated decisions ("都需要讨论 你来为我作选择吧")

---

## 明/暗色策略

| Option | Description | Selected |
|--------|-------------|----------|
| 深色唯一（本里程碑） | 延续 Atelier，AUD-03 书面决策 + 浅色附录 | ✓ |
| 深色主 + 本阶段实现浅色 | 工作量翻倍，与 Phase 3–4 冲突 | |
| 跟随系统 `prefers-color-scheme` | 当前无 light token，审计未覆盖浅色 | |

**User's choice:** 委托 Claude — 深色唯一
**Notes:** 理由绑定 Phase 1 P0 暗底审计；浅色仅 SPEC 附录

---

## 间距与留白尺度

| Option | Description | Selected |
|--------|-------------|----------|
| 维持 gap-7 + 局部收紧 | 与「大留白」目标冲突 | |
| 8px 栅格 + 加大 app-page gap + 限 panel 数 + 禁任意 min-h | 对齐 backlog P0 #1–2 | ✓ |
| 极端稀疏（gap-16 全站） | 列表/工作台信息效率过低 | |

**User's choice:** 委托 Claude — 8px 栅格与 1+1 panel 上限
**Notes:** spacing CSS 变量写入 globals + SPEC

---

## 字号阶梯与任意 px

| Option | Description | Selected |
|--------|-------------|----------|
| 保留现状，仅文档建议 | 无法消除 50+ 任意 px | |
| 五级语义 + 禁 `(app)` 新增任意 px + 迁移 P0 文件 | 对齐 UI-REVIEW Typography 2/4 | ✓ |
| 强制全库一次性替换 | 超出 Phase 2 边界 | |

**User's choice:** 委托 Claude — 五级 + 禁止项 + Phase 4 迁移
**Notes:** globals utility 改为命名 class 引用

---

## 卡片 / 边框 / 阴影

| Option | Description | Selected |
|--------|-------------|----------|
| 废除 surface-panel | 改动面过大 | |
| 保留三类 utility，扁平无边距阴影，减层数 | 渐进收敛 | ✓ |
| 加重阴影强调层级 | 违背克制目标 | |

**User's choice:** 委托 Claude — 扁平 border，步骤无页脚 panel
**Notes:** 圆角与 `--radius-md` 对齐

---

## 主色与 CTA / 状态色

| Option | Description | Selected |
|--------|-------------|----------|
| 维持装饰性 text-primary | 延续 backlog #11 | |
| 每视口 1 主 CTA + 语义 info/warning token | 60/30/10 + 替换 amber/sky | ✓ |
| 降低 primary 饱和度换品牌色 | 非本阶段目标 | |

**User's choice:** 委托 Claude — CTA 独占 primary + 新语义色
**Notes:** theme-tokens + design-system 色板同步

---

## SPEC 与 design-system 落地顺序

| Option | Description | Selected |
|--------|-------------|----------|
| 先改 CSS 后写文档 | token 与原则易漂移 | |
| UI-SPEC → globals/tokens → design-system 验收页 | ROADMAP 单一事实来源 | ✓ |
| 仅 UI-SPEC 不改代码 | 不满足 success criteria #3 | |

**User's choice:** 委托 Claude — SPEC 优先，02-01 草案 / 02-02 定稿
**Notes:** design-system 仍非导航

---

## Claude's Discretion

全部六个灰色地带均由 Claude 按 Phase 1 审计与 PROJECT 约束拍板；用户未逐题作答。

## Deferred Ideas

- 浅色完整实现、IA 重构、workbench 拆分、legacy API — 见 CONTEXT.md `<deferred>`
