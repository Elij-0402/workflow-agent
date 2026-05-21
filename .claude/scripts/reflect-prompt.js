#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const FRICTION_HIGH = 5;
const FRICTION_LOW = 2;
const DEFAULT_LINE_THRESHOLD = 15;
const FRICTION_LOW_THRESHOLD = 5;
const SESSION_TTL_DAYS = 14;
const TRANSCRIPT_TAIL_LINES = 80;

async function readStdin() {
  if (process.stdin.isTTY) return {};
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function isWhitelisted(filePath) {
  if (filePath.startsWith("src/components/ui/")) return false;
  if (filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx")) return false;
  if (filePath.endsWith(".md")) return false;
  if (filePath.startsWith("src/") && /\.(ts|tsx|css)$/.test(filePath)) return true;
  if (filePath.startsWith("supabase/migrations/") && filePath.endsWith(".sql")) return true;
  return false;
}

function gitOut(cmd, cwd) {
  try {
    return execSync(cmd, {
      encoding: "utf8",
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

function listChangedFiles(cwd) {
  const tracked = gitOut("git diff --name-only -w HEAD -- src/ supabase/migrations/", cwd)
    .split("\n")
    .filter(Boolean);
  const untracked = gitOut(
    "git ls-files --others --exclude-standard -- src/ supabase/migrations/",
    cwd,
  )
    .split("\n")
    .filter(Boolean);
  return {
    changed: tracked.filter(isWhitelisted),
    newFiles: untracked.filter(isWhitelisted),
  };
}

function countNetLines(files, cwd) {
  if (!files.length) return 0;
  const args = files.map((f) => `"${f}"`).join(" ");
  const out = gitOut(`git diff --shortstat -w --ignore-blank-lines HEAD -- ${args}`, cwd);
  const m = out.match(/(\d+) insertion[^,]*(?:, (\d+) deletion)?/);
  if (!m) return 0;
  return (Number(m[1]) || 0) + (Number(m[2]) || 0);
}

function countFriction(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return 0;
  let friction = 0;
  try {
    const lines = fs
      .readFileSync(transcriptPath, "utf8")
      .trim()
      .split("\n")
      .slice(-TRANSCRIPT_TAIL_LINES);
    for (const line of lines) {
      if (!line.trim()) continue;
      let content;
      try {
        const ev = JSON.parse(line);
        content = JSON.stringify(ev);
      } catch {
        continue;
      }
      if (/"is_error"\s*:\s*true/.test(content)) friction++;
      else if (/exit code[:\s]+[1-9]/i.test(content)) friction++;
      else if (/error TS\d+|eslint/i.test(content)) friction++;
    }
  } catch {}
  return friction;
}

function loadMarker(markerFile) {
  if (!fs.existsSync(markerFile)) return { seen: new Set(), kept: [] };
  const cutoff = Date.now() - SESSION_TTL_DAYS * 24 * 3600 * 1000;
  const seen = new Set();
  const kept = [];
  for (const line of fs.readFileSync(markerFile, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const { sid, ts } = JSON.parse(line);
      if (ts > cutoff) {
        seen.add(sid);
        kept.push(line);
      }
    } catch {}
  }
  return { seen, kept };
}

function writeMarker(markerFile, kept, sid) {
  kept.push(JSON.stringify({ sid, ts: Date.now() }));
  try {
    fs.mkdirSync(path.dirname(markerFile), { recursive: true });
  } catch {}
  fs.writeFileSync(markerFile, kept.join("\n") + "\n");
}

(async () => {
  const input = await readStdin();

  // Layer 1: cheap exits
  if (input.stop_hook_active) return;
  if (input.permission_mode === "plan") return;
  if (process.env.NOVELFUSION_NO_REFLECT === "1") return;
  const sid = input.session_id;
  if (!sid) return;

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const markerFile = path.join(projectDir, ".claude", ".reflected-sessions");

  // Layer 2: session uniqueness
  const { seen, kept } = loadMarker(markerFile);
  if (seen.has(sid)) return;

  // Layer 3: path whitelist + volume
  const { changed, newFiles } = listChangedFiles(projectDir);
  if (!changed.length && !newFiles.length) return;
  const netLines = countNetLines(changed, projectDir);

  // Layer 4: friction
  const friction = countFriction(input.transcript_path);

  let lineThreshold = DEFAULT_LINE_THRESHOLD;
  if (friction >= FRICTION_HIGH) lineThreshold = 0;
  else if (friction >= FRICTION_LOW) lineThreshold = FRICTION_LOW_THRESHOLD;

  const passes = netLines >= lineThreshold || newFiles.length >= 1;
  if (!passes) return;

  writeMarker(markerFile, kept, sid);

  const isFriction = friction >= FRICTION_LOW;
  const lead = isFriction
    ? `本次会话遇到 ${friction} 次错误/失败信号——这通常是最值得记录踩坑的时刻。`
    : `本次会话修改了项目代码（净 ${netLines} 行${
        newFiles.length ? ` + ${newFiles.length} 个新文件` : ""
      }）。`;
  const reason = [
    lead,
    "",
    "是否发现了非显然的根因、绕过办法、或值得加到 CLAUDE.md 的约束？",
    "",
    "• 有则：追加到 docs/LESSONS.md「待审核」段（日期 / 模块 / 场景 / 错误或发现 / 教训 / 建议更新的 CLAUDE.md），然后 Stop。",
    "• 无则：回复「无新发现」并 Stop。",
    "",
    "不要修改 CLAUDE.md（由维护者 review LESSONS.md 后手动合并）；不要做超出反思范围的代码改动。",
  ].join("\n");

  process.stdout.write(JSON.stringify({ decision: "block", reason }));
})();
