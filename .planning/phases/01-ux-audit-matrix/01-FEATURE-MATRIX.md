# Phase 1: 全站功能矩阵

**Audited:** 2026-05-26
**Scope:** `(app)` routes, API capability clusters, Server Actions（D-01）
**Inputs:** `src/app/**`, `app-nav.tsx`, `01-CONTEXT.md` D-02/D-08

---

## 路由清单（SSOT）

枚举日期：2026-05-26（`Get-ChildItem src/app -Recurse -Filter page.tsx` → **16** 个 `page.tsx`）。URL 映射：去掉路由组 `(app)`、`(auth)`；动态段保留为 `[id]`、`[briefId]`。

| File path | URL pattern | Audit tier | Notes |
|-----------|-------------|------------|-------|
| `src/app/page.tsx` | `/` | Edge | 登录分流：已认证 → `/sessions`，未认证 → `/login` |
| `src/app/(auth)/login/page.tsx` | `/login` | Auth | 认证入口；`src/app/(auth)/actions.ts` |
| `src/app/(app)/sessions/page.tsx` | `/sessions` | P0 | 双书项目列表；CTA 链向 `/upload?mode=dual` |
| `src/app/(app)/sessions/[id]/page.tsx` | `/sessions/[id]` | P0 | dual 模式常 `redirect` → workbench；单书为会话详情 |
| `src/app/(app)/sessions/[id]/workbench/page.tsx` | `/sessions/[id]/workbench` | P0 | 双书英雄工作台（`workbench-client.tsx`） |
| `src/app/(app)/create/page.tsx` | `/create` | P2 | Sidebar「新建项目」主 CTA |
| `src/app/(app)/upload/page.tsx` | `/upload` | P2 | `?mode=dual` 为双书上传入口 |
| `src/app/(app)/studio/page.tsx` | `/studio` | P1 | 创作台列表 |
| `src/app/(app)/studio/new/page.tsx` | `/studio/new` | P2 | 新建简报 |
| `src/app/(app)/studio/[briefId]/page.tsx` | `/studio/[briefId]` | P2 | 简报详情/编辑 |
| `src/app/(app)/compare/page.tsx` | `/compare` | P1 | 对比洞察 |
| `src/app/(app)/library/page.tsx` | `/library` | P1 | 资料库 |
| `src/app/(app)/settings/page.tsx` | `/settings` | P1 | 设置；`settings/actions.ts` |
| `src/app/(app)/design-system/page.tsx` | `/design-system` | Appendix | 参考页，不计产品 UX 达标（D-12） |
| `src/app/(app)/dashboard/page.tsx` | `/dashboard` | Edge | `redirect("/sessions")` |
| `src/app/(app)/sessions/archived/page.tsx` | `/sessions/archived` | Edge | `redirect("/library")` |

**Delta vs RESEARCH（2026-05-26）：** 无遗漏；枚举数与 RESEARCH 表一致（16）。

---

## API 能力簇（非逐文件一行）

按用户可感知能力聚类（D-01）。完整 `route.ts` 清单见下节「API / Server Action 索引」。

| Capability cluster | Routes | Matrix row hint |
|--------------------|--------|-----------------|
| Session lifecycle | `sessions/[id]`, `sessions/bulk` | 会话 CRUD、归档、批量 |
| Analyze | `analyze`, `analyze/extended`, `analyze/chapter`, `analyze/book` | 分析管线；legacy `analyze` 对 dual 可能 409 |
| Blueprint | `blueprint`, `blueprint/confirm`, `blueprint/unconfirm` | 主路径 confirm 门禁 |
| Generate | `generate-v2`（hero）, `generate`, `generate/preview`, `generate/iterate` | v2 为双书主路径；`generate` 为 legacy 边缘 |
| Studio briefs | `briefs`, `briefs/[id]` | 创作台简报支线 |
| Compare insights | `compare/insights` | 对比页数据 |
| Utilities | `chapters/parse`, `variants/[id]` | 上传解析、变体 |

---

## API / Server Action 索引

**API `route.ts`（18）：** `analyze`, `analyze/extended`, `analyze/chapter`, `analyze/book`, `blueprint`, `blueprint/confirm`, `blueprint/unconfirm`, `briefs`, `briefs/[id]`, `chapters/parse`, `compare/insights`, `generate`, `generate-v2`, `generate/preview`, `generate/iterate`, `sessions/[id]`, `sessions/bulk`, `variants/[id]`

**Server Actions（`"use server"`）：**

- `src/lib/upload/actions.ts` — 上传/创建流程
- `src/app/(app)/settings/actions.ts` — 设置（BYOK 等）
- `src/app/(auth)/actions.ts` — 登录

---

## 功能矩阵

表头按 D-02。正文中文；路径/API 英文。

| 路由/入口 | 用户目标 | 与双书主路径关系 | 频率 | 关键依赖 | 客观信号 | 备注 |
|-----------|----------|------------------|------|----------|----------|------|
| `/sessions` | 查看并进入双书/单书项目 | 主 | 高 | `GET/DELETE sessions/[id]`, `sessions/bulk` | **APP_NAV_ITEMS** 顶栏「项目」；sidebar 一级；登录后 **1 步** | 列表 CTA 指向 `/upload?mode=dual` |
| `/sessions/[id]` | 打开会话（单书详情或 dual 跳转工作台） | 主 | 高 | `sessions/[id]`, `analyze/*`, `blueprint` | 情境入口；登录后 **2–3 步**（列表→会话） | `mode=dual` 时 **redirect** → `/sessions/[id]/workbench`；单书分支为次要分析面板 |
| `/sessions/[id]/workbench` | 双书五步：分析→对比/蓝图→确认→生成→阅读 | 主 | 高 | `analyze/chapter`, `analyze/book`, `blueprint`, `blueprint/confirm`, `generate-v2` | 情境深链；登录后 **3–4 步** | P0 英雄 UI；`generate-v2` 为主路径生成 |
| `/create` · `/upload`（流程型入口） | 新建或上传参考书进入会话 | 主路径支撑 | 高 | `src/lib/upload/actions.ts`, `chapters/parse`, `analyze/chapter`, `analyze/book`, `sessions/[id]` | Sidebar「新建项目」→ `/create`（**2 步**）；双书上传 `/upload?mode=dual`（**2–3 步**，非顶栏四项） | D-03 合并一行；勿拆重复 API 行 |
| `/studio` | 管理 AI 创作台简报 | 次要 | 中 | `briefs`, `briefs/[id]` | **APP_NAV_ITEMS** 顶栏「创作台」；登录后 **1 步** | 与主路径 **竞争注意力**（同级导航） |
| `/studio/new` | 创建新简报 | 次要 | 低 | `briefs` | 创作台内 **2 步** | P2 spot-check |
| `/studio/[briefId]` | 编辑/查看单条简报 | 次要 | 低 | `briefs/[id]` | 创作台内 **2–3 步** | P2 |
| `/compare` | 跨书/跨章对比洞察 | 次要 | 中 | `compare/insights` | **APP_NAV_ITEMS** 顶栏「对比」；登录后 **1 步** | 竞争注意力点 |
| `/library` | 浏览归档与资料 | 次要 | 中 | `sessions/bulk`（归档语义） | **APP_NAV_ITEMS** 顶栏「资料库」；登录后 **1 步** | `/sessions/archived` redirect 目标 |
| `/settings` | 配置 API Key 与账户 | 次要 | 低 | `src/app/(app)/settings/actions.ts` | **APP_NAV_ITEMS** footer「设置」；登录后 **1 步**（底栏分隔） | 非四顶栏同级，但常驻 shell |
| `/design-system` | 查看设计 token 参考 | 边缘 | 低 | — | 无主导航项；直达 **3+ 步**（需知 URL） | Appendix（D-12）；生产暴露风险记 P3 |
| `/dashboard` | （遗留）仪表盘入口 | 边缘 | 低 | — | 无导航；**redirect → `/sessions`** | 仅 `redirect("/sessions")` |
| `/sessions/archived` | （遗留）归档列表 | 边缘 | 低 | — | 无导航；**redirect → `/library`** | 仅 `redirect("/library")` |
| `/` | 根路径登录分流 | 边缘 | 中 | `src/app/(auth)/actions.ts` | 登录前 **0 步**；已登录 → `/sessions` | 非 `(app)` shell |
| `/login` | 登录账户 | 边缘 | 中 | `src/app/(auth)/actions.ts` | 认证前入口 | Auth 路由组 |

**导航客观信号摘要（D-08）：** `APP_NAV_ITEMS` 四级顶栏 — 项目 `/sessions`、创作台 `/studio`、对比 `/compare`、资料库 `/library`；footer 设置 `/settings`（见 `src/components/app-nav.tsx`）。Sidebar 品牌区 CTA「新建项目」→ `/create`，与四顶栏并列构成 IA 竞争面。
