# NovelFusion AI

多源小说智能分析与变体生成平台。当前版本 **v0.2** —— 在 v0.1 三维度分析 + 变体生成
闭环之上，新增 **双书蓝图工作台**（chapter-level brief → book synthesis → 结构化
blueprint → 基于蓝图的变体生成 → 三层 variant diff）。

## 功能

### 单书模式（v0.1，沿用）
- 邮箱密码注册 / 登录
- BYOK：每个用户一套 DeepSeek / OpenAI-compatible API Key + Base URL（不支持 Anthropic 原生接口）
- 上传 `.txt` 小说（≤ 50 MB），浏览器直传私有存储后由服务端清洗
- 三维度分析：世界观 / 人物 / 叙事
- 流式生成变体小说

### 双书模式（v0.2 新增）
- 上传两本小说（`/upload?mode=dual`），自动切章后并发执行 chapter-brief 分析
- 选取候选片段合成 book synthesis
- 编辑结构化 blueprint（meta / structure / paragraph），通过 Zod 强校验
- 显式 confirm 后基于蓝图生成变体
- 三层 variant diff：meta / structure / paragraph LCS（含标点和空白归一）
- 批量分析前的 cost estimate 模态框

## 技术栈

- Next.js 15 (App Router, Turbopack) + TypeScript（strict）
- Shadcn UI (new-york) + Tailwind CSS v3.4
- Supabase（Auth + Postgres + Storage + RLS）
- Vercel AI SDK v4（`@ai-sdk/openai`，通过 `createOpenAI({ baseURL })` 适配任意 OpenAI-compatible 网关）
- 测试：`node:test` 单元测试（colocated `*.test.ts`）+ Playwright e2e smoke
- 部署：Vercel

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 Supabase 项目并执行迁移

按顺序在 SQL Editor 中执行：

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_simplify_auth_and_llm_config.sql`
3. `supabase/migrations/0003_restrict_llm_providers_to_openai_compatible.sql`
4. `supabase/migrations/0004_multi_book_blueprint_workbench.sql`

在 Authentication → Providers 启用 Email；在 Authentication → Email 中关闭
Confirm email，确保密码注册后可直接进入应用。

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# 32 字节 base64
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
```

`ENCRYPTION_KEY` 必填；旋转该 key 会让所有已存的 `api_key_encrypted` 失效。

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000，应自动跳转到 `/login`。

### 5. 本地测试用小说样本（可选）

把 `.txt` 小说放进 `samples/` 目录（已 gitignore），供 `/upload` 流程手动测试。
仓库不会跟踪这些文件。

## 部署到 Vercel

1. 推送到 GitHub
2. 在 Vercel 新建项目，导入仓库
3. 配置环境变量（同 `.env.local`）

生产环境的上传走"浏览器直传 Supabase Storage + 服务端确认入库"链路，不依赖 Vercel
Function 接收完整文件体，故可保留 50 MB 上限（`next.config.ts` 也把 Server Action body
limit 提到 60 MB 兜底）。

## 测试

### 单元测试（`node:test`，无 runner）

```bash
node --test --import tsx 'src/**/*.test.ts'          # 全部
node --test --import tsx src/lib/crypto.test.ts      # 单文件
```

注意：`package.json` 的 `npm test` 当前硬编码了一个固定文件列表，**没有**自动覆盖
v0.2 新增的测试文件（blueprint / diff / chapter-batch / 新 prompt 三件套）。
跑全量请用上面的 glob 命令，或参考待修的 follow-up issue。

### E2E Smoke（Playwright）

#### 准备环境变量

复制 `.env.e2e.example` 到本地未跟踪配置：

```bash
E2E_LOGIN_EMAIL=you@example.com
E2E_LOGIN_PASSWORD=your-password
E2E_LLM_BASE_URL=https://api.deepseek.com
E2E_LLM_API_KEY=sk-...
E2E_LLM_MODEL=deepseek-chat
# 可选
E2E_BASE_URL=http://127.0.0.1:3001
```

默认 `npm run test:e2e` 会执行 `build + start -p 3001`，在生产模式下跑 smoke 回归。

#### 一次性安装浏览器

```bash
npx playwright install chromium
```

#### 运行

```bash
npm run test:e2e          # headless
npm run test:e2e:headed   # 带界面调试
```

Smoke 用例执行链路：登录 → 保存 LLM 配置 → 上传 `tests/e2e/fixtures/smoke-test-novel.txt` →
完成三项分析 → 生成首个变体。

依赖：可用的 Supabase 环境、Storage 桶、已执行的所有 4 份迁移、可登录的测试账号、
关闭了 Confirm email；会真实调用模型并消耗你的 BYOK 配额。

## 安全说明

- **API Key 加密存储**：用户的 LLM API Key 写入数据库前用 AES-GCM 加密，密钥源自
  服务端环境变量 `ENCRYPTION_KEY`，绝不下发浏览器
- **RLS 全表启用**：用户数据通过 Postgres Row Level Security 隔离，每张表都有
  `auth.uid() = user_id` 策略
- **私有 Storage**：小说文件存于私有桶 `novels`，路径前缀强制 `{user_id}/`，Storage
  RLS 策略限制访问
- 解密操作只在 Server Action / Route Handler 中发生；API key 不会出现在客户端 bundle、
  组件 props、URL、服务端日志或错误响应中

## 文档

- `CLAUDE.md` —— AI 协作时的项目须知 / 架构说明 / 约定（权威）
- `docs/superpowers/specs/` —— 设计文档归档
