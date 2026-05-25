import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  resolveShellTitle,
  shouldShowSessionsNextHint,
} from "./shell-title";

test("resolveShellTitle maps /sessions list to 项目", () => {
  assert.equal(resolveShellTitle("/sessions"), "项目");
});

test("resolveShellTitle maps workbench to 工作台", () => {
  assert.equal(resolveShellTitle("/sessions/abc/workbench"), "工作台");
});

test("resolveShellTitle maps product routes", () => {
  assert.equal(resolveShellTitle("/studio"), "创作台");
  assert.equal(resolveShellTitle("/compare"), "对比");
  assert.equal(resolveShellTitle("/library"), "资料库");
  assert.equal(resolveShellTitle("/settings"), "设置");
  assert.equal(resolveShellTitle("/upload"), "导入参考书");
  assert.equal(resolveShellTitle("/create"), "创建项目");
});

test("shouldShowSessionsNextHint on list and home only", () => {
  assert.equal(shouldShowSessionsNextHint("/sessions"), true);
  assert.equal(shouldShowSessionsNextHint("/"), true);
  assert.equal(shouldShowSessionsNextHint("/sessions/abc/workbench"), false);
});
