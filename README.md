# NovelFusion AI

多源小说智能分析与变体生成平台。

> 这是 MVP 最小闭环版本（v0.1）。完整 PRD 见 git 历史的 `docs/PRD_NovelFusion_AI_v2.md`（v2.0，1601 行）。

## 功能（v0.1）

- 邮箱密码注册 / 登录
- BYOK：每个用户保存一套 DeepSeek / OpenAI-compatible API Key + Base URL（不支持 Anthropic 原生接口）
- 上传 `.txt` 小说（≤ 50 MB），浏览器直传私有存储后由服务端清洗
- 三维度结构化分析：世界观 / 人物 / 叙事
- 流式生成变体小说
- 会话历史

## 技术栈

- Next.js 15 (App Router) + TypeScript
- Shadcn UI + Tailwind CSS v3.4
- Supabase (Auth + Postgres + Storage + RLS)
- Vercel AI SDK v4 (`@ai-sdk/openai`)
- 部署：Vercel

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 Supabase 项目

1. 访问 https://supabase.com 创建新项目
2. 在 SQL Editor 中运行 `supabase/migrations/0001_init.sql`
3. 再运行 `supabase/migrations/0002_simplify_auth_and_llm_config.sql`
4. 再运行 `supabase/migrations/0003_restrict_llm_providers_to_openai_compatible.sql`
5. 在 Authentication → Providers 启用 Email
6. 在 Authentication → Email 中关闭 Confirm email，确保密码注册后可直接进入应用

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local`，填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# 生成 32 字节 base64 密钥
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
```

`ENCRYPTION_KEY` 是必填项。没有它时，设置页保存 LLM 配置会在服务端加密阶段失败。

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000，应自动跳转到 `/login`。

## 部署到 Vercel

1. 推送到 GitHub
2. 在 Vercel 新建项目，导入仓库
3. 配置环境变量（同 `.env.local`）

说明：生产环境下大文件上传走“浏览器直传 Supabase Storage + 服务端确认入库”链路，不依赖 Vercel Function 接收完整文件体，因此可保留 50 MB 上限。

## 本地回归 Smoke Test

### 1. 准备 E2E 环境变量

复制 `.env.e2e.example` 到你自己的本地未跟踪配置中，至少准备这些环境变量：

```bash
E2E_LOGIN_EMAIL=you@example.com
E2E_LOGIN_PASSWORD=your-password
E2E_LLM_BASE_URL=https://api.deepseek.com
E2E_LLM_API_KEY=sk-...
E2E_LLM_MODEL=deepseek-chat
```

可选：

```bash
E2E_BASE_URL=http://127.0.0.1:3001
```

默认情况下，`npm run test:e2e` 会自动执行 `build + start -p 3001`，并在生产模式下运行 Playwright smoke 回归。

### 2. 一次性安装 Playwright 浏览器

```bash
npx playwright install chromium
```

### 3. 运行 smoke E2E

```bash
npm run test:e2e
```

带界面调试：

```bash
npm run test:e2e:headed
```

这条 smoke 用例会真实执行下面的业务链路：

- 登录
- 保存 LLM 配置
- 上传 `smoke-test-novel.txt`
- 完成三项分析
- 生成第一个结果版本

注意：

- E2E 依赖可用的 Supabase 环境、Storage 桶和已执行过的数据库迁移
- 测试账号需要已存在且可以直接密码登录
- Supabase Auth 里的 Confirm email 需要关闭
- 测试会真实调用模型，并消耗你的 BYOK 配额

## 安全说明

- **API Key 加密存储**：用户的 LLM API Key 在写入数据库前用 AES-GCM 加密，密钥由服务端环境变量 `ENCRYPTION_KEY` 派生，绝不下发浏览器
- **RLS 启用**：所有用户数据通过 Postgres Row Level Security 隔离，用户仅能访问自己 `user_id` 下的行
- **私有 Storage**：小说文件存于私有桶 `novels`，路径前缀为 `{user_id}/`，Storage RLS 策略限制访问
