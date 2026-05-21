#!/usr/bin/env node
const { execFileSync } = require("child_process");

(async () => {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  let file;
  try {
    file = JSON.parse(data)?.tool_input?.file_path;
  } catch {
    return;
  }
  if (!file) return;
  try {
    execFileSync("npx", ["prettier", "--write", "--log-level", "warn", file], {
      stdio: "ignore",
      shell: true,
    });
  } catch {
    // Silent fail-open: prettier may reject unsupported extensions or paths outside CWD.
  }
})();
