# `src/lib/` — 核心库

父级 `D:\workflow-agent\CLAUDE.md` 有项目全局上下文，此文件聚焦本目录的「不能搞错」约定。

## 子目录速查

| 子目录                      | 职责                                                                                                                                                                                     | 复杂度                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `supabase/`                 | 三种 client：`client.ts` (browser anon)、`server.ts` 的 `createClient` (server + user cookies + RLS) 与 `createServiceClient` (service role, bypass RLS)、`middleware.ts` (session 刷新) | **高 · 载重**                 |
| `llm/dispatch.ts`           | `getUserLLMClient` 解密 + 派发到用户配置的 OpenAI-compatible endpoint                                                                                                                    | **高 · 载重**                 |
| `prompts/`                  | 6 个 system prompt：`worldview` `characters` `narrative` `chapter-brief` `book-synthesis` `generate(-from-blueprint)`                                                                    | 中                            |
| `blueprint/`                | `schema.ts` (Zod) + `merge.ts` (`applyCandidate` 去重)                                                                                                                                   | **高**                        |
| `diff/`                     | `variant-diff.ts` 三层 diff（meta / structure / paragraph LCS）                                                                                                                          | 中                            |
| `text/`                     | `chapters.ts` 章节抽取、`clean.ts` 空白清洗、`decode.ts` 编码识别                                                                                                                        | 中                            |
| `upload/`, `cost/`, `auth/` | 小工具：上传 Action、token 预估、密码登录封装                                                                                                                                            | 低                            |
| 根文件                      | `types.ts` `llm-config.ts` `crypto.ts` `session-status.ts` `utils.ts`                                                                                                                    | **高**（crypto / llm-config） |

## BYOK + 单模型范式（载重，不要重新设计）

每个 LLM 调用：读 `llm_config` 一行/用户 → `crypto:decrypt` API key → `createOpenAI({ baseURL })` 派发到 OpenAI / DeepSeek / 自定义 OpenAI-compatible。三种 dimension + 变体生成只是 system prompt 不同，**没有「每任务选模型」概念**——这是 migration `0002` 的初衷。

## 加密（`crypto.ts`）

- AES-GCM via `webcrypto`，**服务端独占**——bundle 进 client 会崩，但更重要的是 key 绝不能到客户端
- `ENCRYPTION_KEY` 是 32 字节 base64 env，轮换会让所有 `api_key_encrypted` 作废
- 暴露 `encrypt` / `decrypt` / `maskApiKey`

## Zod schemas 是 LLM 契约

`WorldviewResultSchema` / `CharactersResultSchema` / `NarrativeResultSchema` / `GenerateConfigSchema` 在 `types.ts`。配 `ai` SDK 的 `generateObject` / `streamObject` 用，写入 `analyses.result` 前**必须 parse 通过**。

## Blueprint 写入闸门

所有 blueprint 写入路径都经 `BlueprintSchema.parse`（在 `/api/blueprint` PATCH 服务端）。`merge.ts:applyCandidate` 按 per-section identity key + source 去重——破坏 identity key 等于破坏去重。

## `llm-config.ts` 单点

- `LLMConfigFormSchema`（Zod）、`LLMConfig` 行类型、`parseLLMConfigFormData`（含 `allowEmptyApiKey` 让 settings 表单允许编辑其他字段不重输 key）
- `selectLegacyPresetForMigration` 仅用于 migration 0002 的数据搬运，不要在新代码里用

## 测试

- `*.test.ts` 与被测文件同级，`node:test` + `node:assert/strict`
- 单文件跑：`node --test --import tsx src/lib/<dir>/<file>.test.ts`
- `tsconfig.json` 把 `**/*.test.ts` 从 build 里排掉
