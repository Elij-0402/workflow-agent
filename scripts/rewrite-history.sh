#!/usr/bin/env sh
# Rebuild main as ~18 milestone commits from archive tag (tree-preserving).
set -eu

ARCHIVE_TAG="${ARCHIVE_TAG:-archive/history-pre-rewrite-2026-05-24}"
BACKUP_BRANCH="${BACKUP_BRANCH:-backup/pre-rewrite-main}"

if ! git rev-parse "$ARCHIVE_TAG" >/dev/null 2>&1; then
  echo "Missing tag: $ARCHIVE_TAG" >&2
  exit 1
fi

git branch -f "$BACKUP_BRANCH" "$ARCHIVE_TAG"

parent=""
while IFS='|' read -r end_commit msg; do
  [ -z "$end_commit" ] && continue
  tree="$(git rev-parse "${end_commit}^{tree}")"
  if [ -z "$parent" ]; then
    parent="$(git commit-tree "$tree" -m "$msg")"
  else
    parent="$(git commit-tree "$tree" -p "$parent" -m "$msg")"
  fi
done <<'EOF'
fcc8103|chore: 初始化 NovelFusion AI 仓库
0be3cf0|feat: 认证、BYOK 加密与单书分析生成闭环
fbe9e02|ci: 添加 GitHub Actions 与 TypeScript 单元测试
01ab4bc|fix: 大文件上传与导航体验
8681054|fix(security): SSRF、RLS 与不可信文本隔离
0601f9b|docs: 多书蓝图工作台设计与实现计划
11d8014|feat(db): 双书模式 schema 与章节解析
c6b9ebf|feat(api): 蓝图工作台后端与 legacy 门禁
51a3231|feat(workbench): 双书工作台 UI 与 variant diff
a8963ff|feat(wireup): 上传模式选择与 dashboard 路由
ab393e9|chore: 清理设计文档、样本目录与测试结构
47902b7|feat(ui): Atelier Terminal 主题重塑
2701f3f|feat: V0.3 扩展分析维度与创作简报
8fd1329|feat(compare): 多会话对比与导出
fcba54f|feat: 本地化、设计系统页与文档同步
2742009|feat: Prompt/Schema 版本化
21ae5be|feat: 项目中心化应用壳与双书概览
807cfd9|chore: gitignore 与临时日志清理
EOF

archive_tree="$(git rev-parse "${ARCHIVE_TAG}^{tree}")"
rewrite_tree="$(git rev-parse "${parent}^{tree}")"
if [ "$archive_tree" != "$rewrite_tree" ]; then
  echo "Tree mismatch after rewrite!" >&2
  echo "  archive: $archive_tree" >&2
  echo "  rewrite: $rewrite_tree" >&2
  exit 1
fi

git checkout -B main "$parent"
echo "Rewrote main to $parent ($(git rev-list --count main) commits)"
