# NovelFusion AI

多源小说智能分析与变体生成平台。

> 这是 MVP 最小闭环版本（v0.1）。完整 PRD 见 git 历史的 `docs/PRD_NovelFusion_AI_v2.md`（v2.0，1601 行）。

## 功能（v0.1）

- 邮箱密码注册 / 登录
- BYOK：每个用户保存一套 DeepSeek / OpenAI 兼容 API Key + Base URL
- 上传 `.txt` 小说（≤ 50 MB），客户端清洗
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
4. 在 Authentication → Providers 启用 Email
5. 在 Authentication → Email 中关闭 Confirm email，确保密码注册后可直接进入应用

### 3. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# 生成 32 字节 base64 密钥
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
```

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000，应自动跳转到 `/login`。

## 部署到 Vercel

1. 推送到 GitHub
2. 在 Vercel 新建项目，导入仓库
3. 配置环境变量（同 `.env.local`）

## 安全说明

- **API Key 加密存储**：用户的 LLM API Key 在写入数据库前用 AES-GCM 加密，密钥由服务端环境变量 `ENCRYPTION_KEY` 派生，绝不下发浏览器
- **RLS 启用**：所有用户数据通过 Postgres Row Level Security 隔离，用户仅能访问自己 `user_id` 下的行
- **私有 Storage**：小说文件存于私有桶 `novels`，路径前缀为 `{user_id}/`，Storage RLS 策略限制访问
