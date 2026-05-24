# 贡献指南

## Git 提交规范

本仓库采用 **中文 Conventional Commits** 主题行，与 [CHANGELOG.md](./CHANGELOG.md) 里程碑风格一致。

### 一次性本地配置（仅当前仓库）

```bash
git config commit.template .gitmessage
git config core.hooksPath .githooks
```

请勿使用 `--global`，以免覆盖其他项目的习惯。

### Windows 说明

`.githooks/commit-msg` 为 POSIX shell 脚本。若钩子未自动执行，请使用 **Git Bash** 提交，或确保 `sh` 在 PATH 中。Git for Windows 通常已包含。

### 提交前建议

```bash
npm run format:check   # 或 npm run format
npm run type-check
npm test
```

钩子 **仅校验 commit message**，不在提交时运行 Prettier。

完整旧 SHA 对照见 [docs/GIT_HISTORY.md](docs/GIT_HISTORY.md)；2026-05-24 历史改写备份 tag：`archive/history-pre-rewrite-2026-05-24`。

## 开发约定

### 常用命令

```bash
npm run dev          # 本地开发 (http://localhost:3000)
npm run build        # 生产构建
npm run type-check   # tsc --noEmit（build 不跑类型检查）
npm test             # 单元测试 (node:test + tsx)
npm run test:e2e     # Playwright e2e（需配置 .env.e2e）
```

### 架构速览

- **路由**：Next.js App Router，`src/app/(auth)/` 公开认证，`src/app/(app)/` 需登录的业务页。
- **领域逻辑**：`src/lib/`（Supabase 客户端、BYOK 加密、prompt、Zod schema 等）。
- **UI 组件**：`src/components/` 按功能分子目录（如 `sessions/`、`workbench/`、`creative-brief/`）。

### 安全

- LLM API Key 仅在 Server Action / Route Handler 中解密使用；**不得**出现在客户端 bundle、组件 props、URL、服务端日志或错误响应中。
- `ENCRYPTION_KEY` 仅服务端环境变量；`createServiceClient()` 仅在可信服务端使用，且必须带 `.eq("user_id", user.id)` 过滤。

### 测试

- 单元测试与源文件同目录：`*.test.ts`，使用 `node:test` + `tsx`。
- E2E 需 `.env.e2e`（可参考 `.env.e2e.example`）。
