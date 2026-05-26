# Phase 3: 应用壳与导航 IA - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 3-应用壳与导航 IA
**Areas discussed:** 主导航结构, 全局新建 CTA, dual 默认落点, 次要能力分层, 壳层引导文案, 单书与 /create

**Delegation:** 用户要求「全讨论，你来选」— 所有区域由 Claude 按审计 + UI-SPEC 选定推荐项。

---

## 主导航结构

| Option | Description | Selected |
|--------|-------------|----------|
| 保留四项同级顶栏 | 现状，竞争主路径注意力 | |
| 仅「项目」突出 +「更多工具」折叠次要三项 | 符合 IA-03、克制留白 | ✓ |
| 次要项仅页脚、顶栏只留项目 | 过激，资料库/创作台发现性过低 | |

**User's choice:** Claude 推荐（折叠次要区）
**Notes:** 设置保持页脚分隔；非活跃 nav 图标不用 primary。

---

## 全局「新建」CTA

| Option | Description | Selected |
|--------|-------------|----------|
| 继续 `/create` | 现状，与双书分裂（P0 #3） | |
| Primary → `/upload?mode=dual` + secondary 单书 | 对齐矩阵主路径支撑 | ✓ |
| 双按钮同级 primary | 违反「每视口单 CTA」 | |

**User's choice:** Claude 推荐
**Notes:** sessions 页头与空态同步；壳层不再 primary 链 create。

---

## dual 项目默认落点

| Option | Description | Selected |
|--------|-------------|----------|
| 保留概览为默认 | 多一跳（P0 #4） | |
| 概览 + 超大「进入工作台」 | 仍多一步认知 | |
| dual 默认 redirect workbench，概览情境入口 | 最短主路径，概览可回退 | ✓ |

**User's choice:** Claude 推荐
**Notes:** 保留 legacy query redirect；单书不 redirect。

---

## 次要能力分层方式

| Option | Description | Selected |
|--------|-------------|----------|
| 页脚仅链接 | 发现性弱 | |
| 二级 Sheet「更多」 | 多一层交互 | |
| Sidebar Collapsible「更多工具」默认折叠 | 03-02 可交付、移动镜像 | ✓ |
| 删除路由 | 违反里程碑范围 | |

**User's choice:** Claude 推荐
**Notes:** v1 不持久化展开状态。

---

## 壳层引导文案

| Option | Description | Selected |
|--------|-------------|----------|
| 保留「当前主线」surface 块 | 壳层噪声 | |
| 仅改文案 | 仍占 panel | |
| 移除块 + 情境 header 标题 + /sessions 一行提示 | IA-02 30 秒目标 | ✓ |

**User's choice:** Claude 推荐
**Notes:** Logo 副标题「双书蓝图工作台」；禁壳层新增任意 px。

---

## 单书与 /create 在 IA 中

| Option | Description | Selected |
|--------|-------------|----------|
| 顶栏「单书」项 | 与主路径竞争 | |
| 仅列表内分区 + 次级 upload single | 矩阵次要/兼容 | ✓ |
| 下线 /create | 超出范围 | |

**User's choice:** Claude 推荐
**Notes:** /create 页顶主路径提示条，推荐 dual upload。

---

## Claude's Discretion

- Collapsible 组件选型、概览链具体 UI 位置、pathname→标题映射表
- Sidebar 宽度微调

## Deferred Ideas

- Workbench 密度与列表三栏 — Phase 4
- Nav 折叠状态持久化 — v2
- design-system 生产 guard — P3
