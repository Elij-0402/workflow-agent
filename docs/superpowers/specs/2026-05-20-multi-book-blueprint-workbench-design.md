# 多书章节对照与蓝图驱动生成工作台 — 设计文档

- **日期**: 2026-05-20
- **作者**: brainstorming session（Elij-0402）
- **范围**: NovelFusion AI v0.2 主路径重构
- **前置版本**: v0.1（单书 → 三维摘要 → 一键生成）
- **状态**: Draft，待 review

---

## 1. 目标与非目标

### 目标
- 把"单书三维摘要 + 一键生成"扩展为"双书章节级研究 + 蓝图驱动生成"工作台。
- 一个任务首版固定支持 2 本小说；分析层级化（章节级 + 整书级）；生成入口必须通过用户确认的"合并蓝图"。
- 同一蓝图可反复生成多个变体，变体之间能并排比较结构与段落差异。
- 不破坏现有单书 session 的可用性。

### 非目标（V2+）
- 3 本及以上书籍对照。
- AI 自动融合双书分析为蓝图（首版仅结构化展示 + 人工勾选）。
- 后台 worker / 队列。
- 章节级段落对齐的字符级 diff。
- 自定义蓝图板块、可拖动板块顺序。
- 多语言（仍中文优先）。

---

## 2. 关键决策摘要

| 主题 | 决策 |
|---|---|
| 章节级分析粒度 | 每章 1 次 LLM 调用，统一抽取固定 schema |
| 生成输入边界 | 仅消费蓝图（不带原文、不带整书汇总） |
| 章节解析兜底 | 三套：扩展 regex → 字数兜底 → 手工编辑 |
| 蓝图条目形态 | 结构化字段（与 `CharactersResultSchema` 同构） |
| 旧单书 session | 单栏路径保留，dual 模式独立路由 |
| 变体比较视图 | 三层 diff：元信息 / 章节结构 / 关键段落（点开抽屉做按段对比） |
| 整体架构 | 方案 C "务实混合"：增量 schema 改动 + 单独 `chapters` 表 + 单一 `blueprints.sections` jsonb + 客户端编排 |

---

## 3. 数据模型与迁移

新增迁移文件 `supabase/migrations/0004_multi_book_blueprint_workbench.sql`。

### 3.1 `sessions`（修改）
- 新增 `mode text not null default 'single' check (mode in ('single','dual'))`。
- 保留 `status` 列。`dual` 模式下不再依赖 `status` 做流程门禁；所有进度从下游表派生。

### 3.2 `books`（修改）
- 新增 `position smallint not null default 0 check (position between 0 and 1)`。
- 新增唯一约束 `unique (session_id, position)`。
- 旧数据：所有现有 `books` 取 `position=0`，对应 session `mode='single'`，无破坏。

### 3.3 `chapters`（新表，章节稳定 ID）
```sql
create table public.chapters (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  index       int  not null,
  title       text not null,
  start_char  int  not null,
  end_char    int  not null,
  source      text not null check (source in ('regex','length-chunk','manual')),
  created_at  timestamptz not null default now(),
  unique (book_id, index)
);
```
- 不存 `content_text`；按 `(start_char, end_char)` 切回 `books.cleaned_content`。
- RLS：`auth.uid() = user_id`。

### 3.4 `analyses`（扩展）
- 新增 `scope text not null default 'book' check (scope in ('book','chapter'))`。
- 新增 `chapter_id uuid null references public.chapters(id) on delete cascade`。
- `dimension` 允许值扩展：保留 `worldview/characters/narrative`（旧路径仍用） + 新增 `chapter_brief`、`book_synthesis`。
- 删除旧唯一约束 `(book_id, dimension)`；改用两个 partial unique index 以正确处理 NULL：
  - `unique index (book_id, dimension) where scope='book' and chapter_id is null`
  - `unique index (book_id, chapter_id, dimension) where scope='chapter' and chapter_id is not null`
  - Postgres 中 NULL 不被认为相等，普通 `unique (a,b,c,d)` 在 c 为 NULL 时会允许重复行，所以这里必须 partial index。
- 旧 3 维度行 `scope='book'`、`chapter_id=null`，自然兼容。

### 3.5 `blueprints`（新表）
```sql
create table public.blueprints (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null unique references public.sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'draft' check (status in ('draft','confirmed')),
  sections     jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_blueprints_updated
  before update on public.blueprints
  for each row execute function public.touch_updated_at();
```
- `sections` 由 Zod `BlueprintSchema` 强校验，结构见 §5。

### 3.6 `variants`（扩展）
- 新增 `blueprint_id uuid null references public.blueprints(id) on delete restrict`。
- 旧 variants 没有蓝图：迁移期保持可空。
- 应用层约束：`sessions.mode='dual'` 下生成的 variants 必须 `blueprint_id NOT NULL`；旧 single 模式仍走原 generate 路径，`blueprint_id` 留空。

### 3.7 RLS
所有新表新增策略 `auth.uid() = user_id`；与现有约定一致。`chapters` 由于通过 `book_id` 间接绑定用户，policy 仍以 `user_id` 列做主防线、应用层 join 时 `books.user_id` 做联防。

---

## 4. 章节流水线

### 4.1 解析三套兜底（顺序应用）

`src/lib/text/chapters.ts`（新模块，从 `clean.ts` 拆出章节逻辑）。

1. **扩展 regex**。现有 `第X章` + `Chapter N` 基础上新增：
   - `^[\s　]*(楔子|序章|序言|前言|引子|尾声|后记|番外|外传)[\s　：:].*$`
   - `^[\s　]*正文[\s　]*\d+.*$`
   - `^[\s　]*第[\d一二三四五六七八九十百千零〇两\s]+[节折部篇].*$`
   - 弱信号：`^[\s　]*\d{1,4}[\s　：:、.\-].{0,30}$`，仅当"上下有空行 + 同模式连续出现 ≥ 3 次"才采纳。

2. **字数兜底**。若 regex 匹配 < 3 章，按固定字数切（默认 5000 字/章）。生成的 `chapters.source = 'length-chunk'`，title 为 `块 #1` / `块 #2`。字数阈值可被用户在导入后修改后重解析。

3. **手工编辑**。导入完成后 session 详情页提供 "调整章节" 入口（仅 dual mode）：列出当前章节边界，允许添加/删除/重命名/调 `start_char` 锚点（提供文本预览窗口）。改完一次性覆盖写 `chapters` 表。**手工重解析或字数兜底重切都会清空该书所有 `scope='chapter'` 的 analyses 行，并在 UI 提示确认。** 不做软迁移。

三套都失败（极端：1 行的文本）→ `chapters` 至少有 1 条覆盖全文。

### 4.2 章节级分析 schema（"轻量统一抽取"）

`src/lib/types.ts` 新增：

```ts
export const ChapterBriefResultSchema = z.object({
  summary: z.string(),
  scenes: z.array(z.object({
    place: z.string(),
    time: z.string().optional(),
    description: z.string(),
  })),
  characters_appeared: z.array(z.object({
    name: z.string(),
    action: z.string(),
  })),
  events: z.array(z.object({
    title: z.string(),
    description: z.string(),
    is_turning_point: z.boolean().default(false),
  })),
  conflicts: z.array(z.string()),
  viewpoint: z.string().optional(),
  themes_hints: z.array(z.string()).default([]),
  blueprint_candidates: z.array(z.object({
    section: z.enum([
      'characters','relationships','world_rules',
      'conflicts','plot_beats','viewpoint','themes',
    ]),
    title: z.string(),
    payload: z.unknown(),
  })).default([]),
});
```

- `blueprint_candidates` 是预先生成的"可入蓝图候选"，每个 candidate 的 `payload` 在被加入蓝图时按 `section` 对应的 `BlueprintSchema` 子 schema 再次 parse。
- 输入：单章正文（按 `(start_char, end_char)` 切片），超长章节硬截到 12,000 字符。
- 落 `analyses`：`scope='chapter'`, `chapter_id=<X>`, `dimension='chapter_brief'`。

新 prompt 文件 `src/lib/prompts/chapter-brief.ts`（system prompt + `wrapUntrustedNovel` 包裹用户输入）。

### 4.3 整书汇总（`book_synthesis`）

一本书所有章节 `chapter_brief` 收集完毕后，触发单次 LLM 调用合成：

```ts
export const BookSynthesisResultSchema = z.object({
  characters:    z.array(z.object({ name: z.string(), role: z.string(), traits: z.array(z.string()), description: z.string() })),
  relationships: z.array(z.object({ from: z.string(), to: z.string(), type: z.string(), description: z.string() })),
  world_rules:   z.array(z.object({ rule: z.string(), description: z.string() })),
  conflicts:     z.array(z.object({ title: z.string(), description: z.string() })),
  plot_beats:    z.array(z.object({ title: z.string(), description: z.string(), order: z.number().int() })),
  viewpoint:     z.object({ mode: z.string(), pacing: z.string() }),
  themes:        z.array(z.string()),
});
```

- 输入：该书所有 `chapter_brief.result` 的 JSON 数组（不传原文）。
- 落 `analyses`：`scope='book'`, `chapter_id=null`, `dimension='book_synthesis'`。
- **触发前置**：该书所有 chapter 均已有 `chapter_brief` 行（UI 灰按钮）。
- 两本书完全异步：A 书可一边在跑章节，B 书一边在编辑蓝图。

新 prompt 文件 `src/lib/prompts/book-synthesis.ts`。

---

## 5. 蓝图模型与状态

### 5.1 Zod schema

`src/lib/blueprint/schema.ts`：

```ts
export const BlueprintSourceSchema = z.object({
  book_id: z.string().uuid(),
  chapter_id: z.string().uuid().nullable(),  // null = 整书汇总
});

const baseItem = {
  id: z.string().uuid(),
  notes: z.string().default(''),
  sources: z.array(BlueprintSourceSchema).default([]),
};

export const BlueprintSchema = z.object({
  characters: z.array(z.object({
    ...baseItem,
    name: z.string(), role: z.string(), traits: z.array(z.string()),
    description: z.string(),
  })),
  relationships: z.array(z.object({
    ...baseItem,
    from: z.string(), to: z.string(), type: z.string(), description: z.string(),
  })),
  world_rules: z.array(z.object({
    ...baseItem, rule: z.string(), description: z.string(),
  })),
  conflicts: z.array(z.object({
    ...baseItem, title: z.string(), description: z.string(),
  })),
  plot_beats: z.array(z.object({
    ...baseItem, title: z.string(), description: z.string(), order: z.number().int(),
  })),
  viewpoint: z.object({
    mode: z.string(), pacing: z.string(), notes: z.string().default(''),
  }),
  themes: z.array(z.object({
    ...baseItem, theme: z.string(),
  })),
});
export type Blueprint = z.infer<typeof BlueprintSchema>;
```

- 每条目内有 `id`（前端 uuid）、`notes`、`sources[]`（可多源）。
- `viewpoint` 是单 object —— 一个生成任务只能有一个叙事视角设定。

### 5.2 状态机

`draft ⇄ confirmed`。

**`confirm` 前置条件**：
- 每个数组板块 `length >= 1`。
- `viewpoint.mode` 非空。
- 写入 `confirmed_at = now()`。

**生成约束**：
- `/api/generate` 仅接受 `blueprintId`，并要求 `blueprint.status === 'confirmed'` 且 `blueprint.user_id === auth.uid()`。

**解锁回 draft**：
- 显式 action，写 `status='draft'`、清 `confirmed_at`。
- 已生成的 variants 不删；前端 UI 上挂 "基于旧版本蓝图" 角标（比对 `variants.created_at` 与最近一次 `confirmed_at`）。

### 5.3 写入接口

Server Action `updateBlueprint(sessionId, patch)`（`src/app/(app)/sessions/[id]/workbench/actions.ts`）：
- 服务端读 → JSON merge → `BlueprintSchema.parse` → upsert。
- 乐观并发：客户端传 `updated_at`，不一致时返回 `{ error: '蓝图已在其他窗口被更新，请刷新后再编辑。' }`。

---

## 6. API 与运行时编排

### 6.1 新增路由

| 路由 | 方法 | 入参 | 说明 |
|---|---|---|---|
| `/api/chapters/parse` | POST | `{ bookId, mode: 'regex'\|'length'\|'manual', payload? }` | 覆盖写 `chapters`，幂等；mode='manual' 时 `payload` 为完整 chapter 列表 |
| `/api/analyze/chapter` | POST | `{ bookId, chapterId }` | 单章 `chapter_brief`，幂等 upsert |
| `/api/analyze/book` | POST | `{ bookId }` | 要求该书 chapter_brief 全齐，产 `book_synthesis` |
| `/api/blueprint` | PATCH | `{ sessionId, patch, expectedUpdatedAt }` | 部分 sections 合并 + 强校验 |
| `/api/blueprint/confirm` | POST | `{ sessionId }` | 前置校验通过后写 `status='confirmed'` |
| `/api/blueprint/unconfirm` | POST | `{ sessionId }` | 写 `status='draft'` |
| `/api/generate` | POST | `{ blueprintId, config }` | 新签名；仅 dual mode 工作台调用 |

### 6.2 旧路由保留
`/api/analyze`（按 dimension 跑整书三维）与旧 `/api/generate` 单书版本**保留**，仅在 `sessions.mode='single'` 时可用：路由入口处 guard。

### 6.3 客户端编排

- 不引入 React Query / SWR；沿用 `fetch + toast` + Server Action。
- 章节批量分析：客户端维护并发上限 = 3 的 promise pool。
  - 用户点 "分析全书章节"，前端按 chapter index 排队 POST `/api/analyze/chapter`。
  - 每章返回后立即更新该章卡片状态。
  - 失败章保留红标可单点重试。
- 中途暂停 / 关闭页面安全：服务端是 per-chapter 幂等的。下次进入页面，根据 `analyses` 行查询缺失章，按钮文案切换到 "继续"。
- **BYOK 成本提示**：开跑前 modal 显示估算："本次将发起约 N 次 LLM 调用，按当前模型粗估约 ¥X（估算值）"。估算 = `chapter_count × 平均章节字符 × 单价系数`。

### 6.4 进度计算
新工作台所有 "完成度" 从查询派生，不依赖 `sessions.status`：
- 章节分析进度 = `count(analyses where book_id=X and scope='chapter') / count(chapters where book_id=X)`。
- 整书汇总状态 = `exists(analyses where book_id=X and dimension='book_synthesis')`。
- 蓝图状态 = `blueprints.status`。
- 变体数 = `count(variants where session_id=X)`。

---

## 7. UI 布局

### 7.1 路由分流
- `mode='single'` → 沿用现有 `src/app/(app)/sessions/[id]/page.tsx`，不变。
- `mode='dual'` → 新页面 `src/app/(app)/sessions/[id]/workbench/page.tsx`。
- session 详情根路由按 `mode` 字段决定走哪条路径。

### 7.2 Workbench 布局

3 行 grid：

```
┌─ PageHeader（任务名 / 两书 chip / 模型 chip） ───────────────┐
├─ Pipeline 阶段条 ─ 导入·章节分析·整书汇总·双书对照·确认蓝图·生成变体 ┤
├─ 左栏：A 书 ─────────────┬─ 右栏：B 书 ─────────────────────┤
│  [章节树 + 筛选条]        │  [章节树 + 筛选条]                │
│  [章节卡片滚动区]         │  [章节卡片滚动区]                 │
├─ 蓝图区（吸底，默认 360px，可拖高度） ─────────────────────┤
│  7 板块 tab，每板块表格化编辑                                  │
│  右侧操作：保存 · 确认蓝图 · 生成变体                          │
└────────────────────────────────────────────────────────────┘
```

### 7.3 章节树 + 卡片
- 章节树：纵向列表，节标题 + 状态点（未分析 / 分析中 / 已分析 / 失败）。
- 顶部筛选条（仅影响下方卡片可见性，章节树常驻完整）：
  - 人物（multi-select，候选来自该书所有 `chapter_brief.characters_appeared`）
  - 冲突类型（multi-select，候选来自 `chapter_brief.conflicts`）
  - 主题关键词（free text contains）
- 章节卡片：默认折叠（标题 + summary 一句话）；展开后展示 `chapter_brief` 结构化结果。
  - 每个 `blueprint_candidate` 右侧 `[+ 加入蓝图]` 按钮：弹 mini picker（默认按 `candidate.section` 预选目标板块），落入蓝图区并自动写 source。
  - 标 chapter 来源：`source` 是 `length-chunk` 或 `manual` 时显示提示。

### 7.4 蓝图区
- 7 板块 tab；每板块为可编辑表格（行内 input / textarea / chip）。
- 每行右侧操作：编辑 notes / 删除 / 跳转到任一 source（高亮对应章节卡片）。
- 顶部右侧：`保存`（持续 autosave 5s debounce 也跑）/ `确认蓝图`（confirm 校验未通过时灰按钮 + 缺失项提示）/ `生成变体`（蓝图未 confirmed 时灰）。

### 7.5 Pipeline 阶段条
替换 `WorkflowStageBar`，新 6 步：`导入 · 章节分析 · 整书汇总 · 双书对照 · 确认蓝图 · 生成变体`。每步状态从派生数据算（§6.4）。

### 7.6 上传流程
- `/upload` 入口先选模式：单书 / 双书对照。
- 双书：先建空 session（mode='dual'），跳到 workbench 后提供"上传第 1 本"/"上传第 2 本"两个槽位，复用现有 `initNovelUpload`/`finalizeNovelUpload`，传入 `{sessionId, position}`。
- 单书：走原流程，session 自动 `mode='single'`。

### 7.7 变体比较视图
- session 详情页底部独立 section "结果对比"（dual mode）。
- 顶部两个 select：v 左 / v 右（默认最新两个）。
- 三层 diff 卡片：
  1. **元信息**：title / 章节数 / 字数 / 生成参数（strategy/innovation/style/output_scope/extra_instructions），逐字段对比。
  2. **章节结构**：列出两版章节列表，相同标题隐藏，仅显示新增 / 缺失 / 顺序变更。
  3. **关键段落**：基于段落 normalize hash（去空白、去标点的归一化短串）+ LCS 找出在 A 出现/B 缺失、在 B 新增 的段落。每条目展开抽屉，做按段对比。
- 单 variant 沉浸阅读：复用现有 `VariantList` 单篇视图入口。

### 7.8 旧 single mode 详情页
完全保留 `AnalysisPanel` / `GeneratePanel` / `VariantList`；不显示任何双书 / 蓝图控件占位。

---

## 8. Prompts 与文本边界

新文件：
- `src/lib/prompts/chapter-brief.ts` — system prompt + 入参包装。
- `src/lib/prompts/book-synthesis.ts` — system prompt + 入参（chapter_briefs JSON 数组）。
- `src/lib/prompts/generate-from-blueprint.ts` — system prompt + 入参（仅 blueprint JSON + 生成参数；不带原文）。

文本长度：
- `CHAPTER_TEXT_CHAR_LIMIT = 12_000`（单章硬截）。
- `BOOK_SYNTHESIS_BRIEFS_LIMIT = 200`（章节数硬截）。≤ 200 章全量传；> 200 章时取首尾各 30 章 + 中段按等间隔抽 140 章 + 所有 `is_turning_point=true` 的章节强制入选（去重）。
- `GENERATE_FROM_BLUEPRINT_NO_EXCERPT` —— generate prompt 显式说明 "无原文，仅按蓝图创作"。

所有用户来源文本统一走 `wrapUntrustedNovel`，保持现有 prompt injection 防护一致。

---

## 9. 测试策略

`node:test` + `node:assert/strict`，沿用现有约定。新增：

- `src/lib/text/chapters.test.ts` — 三套兜底每套 ≥ 2 用例 + 边界（0 章 / 1 章 / 混合标题 / 弱信号被正确忽略 / 弱信号被正确采纳）。
- `src/lib/blueprint/schema.test.ts` — Zod 校验 + `confirm` 前置条件。
- `src/lib/blueprint/merge.test.ts` — `candidate → blueprint item` 幂等性、source 去重。
- `src/lib/diff/variant-diff.test.ts` — 段落级 LCS 对几对典型 LLM 输出（结构变更 / 顺序变更 / 部分重写）。
- `src/lib/prompts/chapter-brief.test.ts` / `book-synthesis.test.ts` / `generate-from-blueprint.test.ts` — prompt 拼装快照 + 注入防护。
- API 路由：mock supabase client + 模型；测 happy path + 权限 + 状态 guard + 幂等性。

不强制 E2E（项目目前无 Playwright），关键流靠手测覆盖。

---

## 10. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 章节级分析高 BYOK 成本 | 统一抽取（每章 1 次）+ 客户端编排并发上限 + 跑前估算 modal |
| 章节解析不准误导分析 | 三套兜底；UI 显式标注 `source`；章节边界手工编辑入口；重解析清空旧分析并提示 |
| 蓝图 confirm 后被解锁、旧 variants 关联失效蓝图 | 不删旧 variants，UI 角标"基于旧蓝图"；用户可溯源 |
| Single mode 与 dual mode 双路径长期共存 | 文档化为 v0.1 兼容路径；新功能仅往 dual 路径加；6 个月后回收评估 |
| 50MB 文件 → cleaned_content 单字段过大 | 暂不动数据库；按需切片读取（API 内按 (start,end) 切片，不一次 select cleaned_content 全字段） |
| 蓝图 jsonb 失去 schema 演进保护 | 每次写入 100% 走 Zod parse；schema 演进通过迁移 + 版本字段 `sections._version` 处理（首版固定 `_version=1`） |

---

## 11. 上线与发布

- 数据库迁移：`0004` 一次迁移完成全部 schema 改动，向后兼容。
- 旧用户 session：自然落入 `mode='single'`，无视觉与功能变化。
- 新用户/新任务：上传时选择"单书 / 双书"。
- 文档更新：`CLAUDE.md` 增补 dual mode 路径、新 API 路由、新表说明。

---

## 12. 公共类型变更摘要

`src/lib/types.ts` 新增导出：
- `ChapterBriefResultSchema` + `ChapterBriefResult`
- `BookSynthesisResultSchema` + `BookSynthesisResult`
- `AnalysisScope = 'book' | 'chapter'`
- `AnalysisDimension` 扩展 `'chapter_brief' | 'book_synthesis'`
- `Database` 新增 `chapters` / `blueprints` 表类型；`books` 添加 `position`；`sessions` 添加 `mode`；`analyses` 添加 `scope`/`chapter_id`；`variants` 添加 `blueprint_id`。

`src/lib/blueprint/schema.ts` 新增：
- `BlueprintSchema` / `Blueprint`
- `BlueprintSourceSchema`
- `BlueprintSection = keyof Blueprint`
- `BlueprintStatus = 'draft' | 'confirmed'`

---

## 13. Open Issues（实现期再定）

- 章节边界手工编辑的具体交互：从文本预览选起止位置 vs 直接输入字符 offset。倾向前者。
- 双书对照筛选条的"主题关键词"是 client-side 全文 contains 还是 server-side `tsvector`。首版倾向 client-side（章节数 ≤ 200，性能够）。
- `variants.blueprint_id` 是否要在 v0.3 强制 NOT NULL（清理 v0.1 旧数据后）。
