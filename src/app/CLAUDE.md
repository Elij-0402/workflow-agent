# `src/app/` — 路由层 + API

App Router 路由组 + API Route Handlers。父级 `D:\workflow-agent\CLAUDE.md` 是全局上下文，此文件是本目录的局部约定。

## Route group 划分

- `(auth)/` — 公开页（`/login`）。`actions.ts` 导出 `submitPasswordAuth` / `signOut`。
- `(app)/` — 需登录。group `layout.tsx` 服务端 `supabase.auth.getUser()`，未登录跳 `/login`，否则渲染 `Sidebar` + `UserMenu`。
- `(app)/sessions/[id]/page.tsx` 服务端检查 `sessions.mode`：dual 则 `redirect('/sessions/${id}/workbench')`，single 走 legacy 三件套（`AnalysisPanel` / `GeneratePanel` / `VariantList`）。
- `middleware.ts` → `@/lib/supabase/middleware:updateSession` 在每个非静态请求刷新 cookie，`PUBLIC_PATHS = ["/login"]`，其他未登录路径重定向到 `/login?redirect=<原路径>`。

## Server Action 返回 shape（铁律）

成功：`{ ok: true, message?: string, redirectTo?: string }`
失败：`{ error: string }`（**中文文案**）
**绝不 throw 跨 action 边界**——参考 `(auth)/actions.ts`、`(app)/settings/actions.ts`。

## Single vs Dual 模式分流

- legacy `/api/analyze` 和 `/api/generate` 对 `sessions.mode='dual'` 主动返回 **409**，防止旧 UI 绕开 blueprint 闸门
- dual 必须走 `/api/generate-v2`，**强制要求** `blueprints.status='confirmed'`
- chapter 级分析走 `/api/analyze/chapter`，book 级综合走 `/api/analyze/book`
- blueprint CRUD 走 `/api/blueprint` PATCH，状态变更走 `/api/blueprint/confirm` 和 `/unconfirm`

**V0.3 brief 流不绕开 blueprint 闸门**——`/api/generate/preview` 仍硬性要求 `blueprints.status='confirmed'`（返回 409 "请先在工作台确认蓝图。"）；`/api/generate/iterate` 通过校验 `outlineVariant.scope === 'outline'` 且 `outlineVariant.session_id === brief.session_id` 间接依赖已 confirmed 的 blueprint；brief CRUD（`/api/briefs[/id]`）独立于 blueprint 状态，可以在任何状态下写入，但生成路径会拦下。

## V0.3 路由速查

- `/api/briefs` — `GET ?sessionId=…`、`POST { sessionId, brief }`，brief 走 `CreativeBriefSchema.parse`
- `/api/briefs/[id]` — `GET` / `PATCH`（局部字段：title / 4 类 directive / status via `CreativeBriefStatusSchema`）/ `DELETE`（硬删）
- `/api/generate/preview` — `POST { briefId, targetChapterCount? }`，SSE 流（`partial` / `done` / `error`），写 `variants(scope='outline', brief_id)`
- `/api/generate/iterate` — `POST { briefId, outlineVariantId, chapterIndex, previousVariantId?, feedback? }`，SSE 流，写 `variants(scope='chapter', parent_variant_id, brief_id)`，**显式校验 `outlineVariant.scope === 'outline'` 且 `outlineVariant.session_id === brief.session_id`**；`previousVariantId` 通过 RLS 保护
- `/api/analyze/extended` — `POST { bookId, dimension ∈ {prose_craft, emotion_arc, pacing_map, suspense_grid} }`，非流式 `generateObject`，写入前小说原文必须经 `wrapUntrustedNovel`
- `/api/sessions/[id]` — `DELETE`（默认软删 = 设 `archived_at`；`?hard=true` 级联硬删）/ `PATCH`（恢复：清 `archived_at`）
- `/api/sessions/bulk` — `POST { action: 'archive'|'restore'|'delete', ids[] (≤100) }`
- `/api/variants/[id]` — `DELETE`

所有 V0.3 路由的返回错误形式与 Server Action 不同：`NextResponse.json({ error: string }, { status })`。**SSE 路由**先 200 打开流，错误以 `event: error\ndata: {message}` 推送后关闭，调用方解析事件类型而不是 HTTP 状态。

## Supabase client 选择（在 Route Handler / Server Action 里）

- **默认用** `@/lib/supabase/server:createClient()` ——带 user cookies，RLS 生效
- 只有真正受信任、且必须绕过 RLS 的场景才用 `createServiceClient()`，且必须显式 `.eq("user_id", user.id)` 二次校验
- **绝不**把 service client 暴露到 Client Component bundle

## API key 不能出现的地方

client bundle / props / URL / 服务端日志 / 错误响应。解密只在 Server Action / Route Handler，调用 `@/lib/llm/dispatch:getUserLLMClient`。

## 杂项

- `next.config.ts` 已把 Server Action body 上限放宽到 60 MB，对应 `novels` storage bucket 的 50 MB 上限
- `auth/callback/` 目前是 OAuth 占位符——email confirm 必须在 Supabase 后台关闭，让 password signup 直接返回 session
- 路径别名 `@/*` → `./src/*`，所有内部 import 都用它
