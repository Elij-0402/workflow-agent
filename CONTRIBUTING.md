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
