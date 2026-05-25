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
