# `src/lib/` — 核心库

父级 `D:\workflow-agent\CLAUDE.md` 有项目全局上下文，此文件聚焦本目录的「不能搞错」约定。

## 子目录速查

| 子目录                      | 职责                                                                                                                                                                                                                                                | 复杂度                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `supabase/`                 | 三种 client：`client.ts` (browser anon)、`server.ts` 的 `createClient` (server + user cookies + RLS) 与 `createServiceClient` (service role, bypass RLS)、`middleware.ts` (session 刷新)                                                            | **高 · 载重**                 |
| `llm/dispatch.ts`           | `getUserLLMClient` 解密 + 派发到用户配置的 OpenAI-compatible endpoint                                                                                                                                                                               | **高 · 载重**                 |
| `prompts/`                  | system prompt + Zod schema 注册中心：维度分析（3 legacy + 4 extended）、章节/全书综合、变体生成（legacy + blueprint）、V0.3 brief 流（compose / preview-outline / iterate-chapter）、防护（`safety:wrapUntrustedNovel`）。`index.ts` 是单一真相之源 | **高 · 载重**                 |
| `blueprint/`                | `schema.ts` (Zod) + `merge.ts` (`applyCandidate` 去重)                                                                                                                                                                                              | **高**                        |
| `types/`                    | `creative-brief.ts` —— V0.3 简报 Zod schema（persona/plot/style/retention 四类 directive + 顶层 `CreativeBriefSchema`）                                                                                                                             | **高**                        |
| `streaming/`                | `sse.ts:sseResponse` —— 把异步 producer 包成 SSE Response，给 `/api/generate/preview` 与 `/api/generate/iterate` 用                                                                                                                                 | 中                            |
| `diff/`                     | `variant-diff.ts` 三层 diff（meta / structure / paragraph LCS）                                                                                                                                                                                     | 中                            |
| `text/`                     | `chapters.ts` 章节抽取、`clean.ts` 空白清洗、`decode.ts` 编码识别                                                                                                                                                                                   | 中                            |
| `workbench/`                | `derive-hint.ts` —— 工作台上下文提示派生纯函数（被 `hint-banner` 用）                                                                                                                                                                               | 低                            |
| `upload/`, `cost/`, `auth/` | 小工具：上传 Action、token 预估、密码登录封装                                                                                                                                                                                                       | 低                            |
| 根文件                      | `types.ts` `llm-config.ts` `crypto.ts` `session-status.ts` `utils.ts` `error-toast.ts`                                                                                                                                                              | **高**（crypto / llm-config） |

## BYOK + 单模型范式（载重，不要重新设计）

每个 LLM 调用：读 `llm_config` 一行/用户 → `crypto:decrypt` API key → `createOpenAI({ baseURL })` 派发到 OpenAI / DeepSeek / 自定义 OpenAI-compatible。无论是 legacy 三维度、V0.2 chapter/book 综合、V0.3 四个扩展维度、还是任何变体生成路径，都只是 system prompt 不同，**没有「每任务选模型」概念**——这是 migration `0002` 的初衷。

## 加密（`crypto.ts`）

- AES-GCM via `webcrypto`，**服务端独占**——bundle 进 client 会崩，但更重要的是 key 绝不能到客户端
- `ENCRYPTION_KEY` 是 32 字节 base64 env，轮换会让所有 `api_key_encrypted` 作废
- 暴露 `encrypt` / `decrypt` / `maskApiKey`

## Zod schemas 是 LLM 契约

`types.ts` 定义九个维度/结果 schema：legacy 三件套 `Worldview` / `Characters` / `Narrative`、双书 `ChapterBrief` / `BookSynthesis`、V0.3 扩展 `ProseCraft` / `EmotionArc` / `PacingMap` / `SuspenseGrid`，外加 `GenerateConfigSchema` 与 `VariantResultSchema`。配 `ai` SDK 的 `generateObject` / `streamObject` 用，写入 `analyses.result` 前**必须 parse 通过**。

**`prompts/index.ts` 是 prompt + schema 的绑定中心**——`ANALYSIS_DIMENSION_CONFIG`（legacy 3）和 `EXTENDED_ANALYSIS_DIMENSION_CONFIG`（extended 4）把每个 dimension 映射到 `systemPrompt` + `schema`。新增维度只在这两个表里加，不要在路由里散布 switch。

## Blueprint 写入闸门

所有 blueprint 写入路径都经 `BlueprintSchema.parse`（在 `/api/blueprint` PATCH 服务端）。`merge.ts:applyCandidate` 按 per-section identity key + source 去重——破坏 identity key 等于破坏去重。

**V0.3 同款闸门**：`CreativeBrief` 写入路径全部经 `CreativeBriefSchema.parse`（`types/creative-brief.ts`）。`/api/briefs` POST 与 `/api/briefs/[id]` PATCH 都先 parse 再落库；`/api/generate/preview` 与 `/api/generate/iterate` 从库里读出后再 `safeParse` 一次以兼容老行——拿到 brief 后用 `prompts/brief-compose:composeBriefIntoPrompt` 注入 system prompt。

## `llm-config.ts` 单点

- `LLMConfigFormSchema`（Zod）、`LLMConfig` 行类型、`parseLLMConfigFormData`（含 `allowEmptyApiKey` 让 settings 表单允许编辑其他字段不重输 key）
- `selectLegacyPresetForMigration` 仅用于 migration 0002 的数据搬运，不要在新代码里用

## 测试

- `*.test.ts` 与被测文件同级，`node:test` + `node:assert/strict`
- 单文件跑：`node --test --import tsx src/lib/<dir>/<file>.test.ts`
- `tsconfig.json` 把 `**/*.test.ts` 从 build 里排掉
