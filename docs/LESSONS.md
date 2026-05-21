# NovelFusion AI · 经验教训记录

> 由 Claude Code 会话结束的反思 hook 自动生成「待审核」条目，由维护者审核后从「待审核」移入「已采纳」，并把对应教训合并到相关 CLAUDE.md。
>
> 每条记录格式：
>
> - **日期**（绝对日期，避免「上周」之类的相对表述）
> - **模块**（如 `src/lib/blueprint`、`src/app/api/generate-v2`、`hooks`）
> - **场景**：当时在做什么
> - **错误 / 发现**：踩到什么坑或观察到什么非显然现象
> - **教训**：抽象出的规则或反模式
> - **建议更新**：哪个 CLAUDE.md 应该添加什么（如不需更新可省略）

---

## 待审核（pending review）

<!-- Claude 会在每次会话结束反思时把新条目追加到这里。维护者审核后移到「已采纳」。 -->

### 2026-05-22 · `dev-server/windows` · `pnpm dev` 卡死后端口 3000 LISTENING 但 HTTP 永远超时

- **场景**：用户报 `http://localhost:3000` 无法启动。`netstat -ano | findstr :3000` 显示有进程在 LISTENING，但 `Invoke-WebRequest http://localhost:3000` 5 秒超时；type-check / lint 全干净，没有任何代码错误。
- **错误 / 发现**：
  1. 用户用 `pnpm dev` 启动了 `next dev --turbopack`（项目实际是 npm 项目，只有 `package-lock.json`，没 `pnpm-lock.yaml`）。当 Next 卡住后 Ctrl+C 在 Windows + pnpm 组合下**没杀掉整条进程树**——pnpm 父进程、`next dev` 子进程、`start-server.js` 孙进程、`postcss.js` worker 全部成为孤儿，继续占着端口 3000 但不响应 HTTP。
  2. 我自己在诊断时用 `Bash run_in_background=true` 又跑了一次 `npm run dev` 试图捕获启动错误——结果 output 文件 **0 字节**。因为端口已被占，Next 启动失败的提示走 stderr 在 Windows 下被吞，**沉默**就是症状本身。这一度让我以为是 Bash 工具问题，差点钻进死胡同。
  3. 进程取证只能靠 `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match ... }`——`Get-Process` 不带命令行，无法区分多个 `node.exe`。
- **教训**：
  - Windows 上诊断 dev server 启动问题，**第一步永远是 `netstat -ano | Select-String ':3000'` + WMI CommandLine 查 PID**，不要先去看代码或 type-check。
  - 端口 3000 LISTENING + HTTP 超时 ≈ "进程在但僵了"，不要再试着启动新的 dev 占同一个端口，先杀进程树再说。
  - `run_in_background` 启 dev server 时如果 output 长时间 0 字节，**优先怀疑端口冲突或父子进程问题**，而非工具本身。前台跑 `npm run dev` 看实时输出更可靠。
  - 杀 Next 进程树用命令行特征匹配比按 PID 杀更鲁棒：`next[\\/]dist[\\/](bin[\\/]next|server[\\/]lib[\\/]start-server)` + `\.next[\\/]postcss\.js`。
- **建议更新**：根 `CLAUDE.md` 的 "Commands" 段可加一条："Windows 上 dev server 启动卡住时，先用 `Get-CimInstance Win32_Process | Where { $_.CommandLine -match 'next[\\/]dist[\\/]' } | ForEach { Stop-Process -Id $_.ProcessId -Force }` 清孤儿进程 + 删 `.next/` 重启。"另外可在 CLAUDE.md 顶部明确"本仓库用 npm，不要 pnpm/yarn"以减少这类工具链不一致引入的怪问题。

### 2026-05-21 · `harness/bash-tool` · Windows 路径在 Bash 工具中被反斜杠转义吃掉

- **场景**：M1 写完准备跑 `npm run type-check`，按习惯敲 `cd /d D:\workflow-agent && npm run type-check`
- **错误 / 发现**：Bash 工具底层走 git-bash（POSIX shell），不是 cmd 或 PowerShell。两个独立症状：
  1. `cd /d D:\workflow-agent` → `cd: too many arguments`（git-bash 不认 cmd 的 `/d` 切盘符标志，`\w` 被当 escape 处理后 `D:` 和剩余路径变两个参数）
  2. `dir D:\workflow-agent\supabase\migrations` → `dir: cannot access 'D:workflow-agentsupabasemigrations'`（反斜杠全被吃掉、路径粘连）
     最终用 `cd "D:/workflow-agent" && ...`（正斜杠 + 双引号包裹）才通。
- **教训**：在 Windows 项目里调用 Bash 工具时，**路径一律用正斜杠**（`D:/workflow-agent/...`）并加双引号；想枚举目录用 Glob 工具而不是 `ls`/`dir`。PowerShell 工具是另一回事——它接受反斜杠，但本环境优先建议用专用工具（Glob/Grep/Read）规避这类 shell 差异。
- **建议更新**：根 `CLAUDE.md` 的 "Commands" 段可加一条 Windows 注意事项；或在仓库根加一份"开发环境路径约定"短笺。

### 2026-05-21 · `workflow/edit-tool` · Edit 改名了不存在的 prop 才发现自己写错

- **场景**：M1 改 `src/app/(app)/sessions/page.tsx` 时给 `PageHeader` 传 `actions={...}`，type-check 没立刻报（运行前），后来想改为 `action=`（单数）发现 `actions=` 是我自己拼错的——`PageHeader` 接口是 `action: ReactNode`。
- **错误 / 发现**：写新调用点时**没先读组件接口**就凭印象传 props；TS 严格模式应该会报，但因为 React 组件 props 不严格（多余 prop 不报）所以静悄悄通过。
- **教训**：调用一个未用过的组件前先 `Grep` 或 `Read` 它的 props 定义，不要凭"复数名更合理"之类直觉。一两秒的核对省去后续修复回合。
- **建议更新**：无需改 CLAUDE.md；这是个人工作流提醒。

---

## 已采纳（accepted）

### 2099-01-01 · `meta` · 示例条目（review 后删除）

- **场景**：演示 LESSONS.md 的条目格式
- **错误 / 发现**：示例
- **教训**：每条 LESSONS 都要带「建议更新哪个 CLAUDE.md」，否则知识沉淀链路断裂
- **建议更新**：（本示例无）
