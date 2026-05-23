import assert from "node:assert/strict";
import test from "node:test";

import type { DualSessionPageData } from "@/app/(app)/sessions/[id]/page-data";

import { deriveProjectOverview } from "./overview";

test("deriveProjectOverview returns upload-focused summary when only one book exists", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [{ chapter_count: 10 }],
    bookSynthesisByBook: [],
    blueprintStatus: "draft",
    variants: [],
  });

  assert.equal(result.statusLabel, "等待补全素材");
  assert.equal(result.progressLabel, "已导入 1 / 2 本参考小说");
  assert.deepEqual(result.nextAction, {
    label: "补充第二本参考书",
    href: "/upload?sessionId=session-1&position=1",
  });
  assert.deepEqual(result.editorialBullets, [
    "先补齐第二本参考小说，系统才能给出稳定的融合判断。",
    "当前可先保留第一本的章节与人物基础结构。",
    "暂不建议进入生成，避免蓝图建立在单侧素材上。",
  ]);
  assert.deepEqual(result.keyResults, [
    { label: "参考小说", value: "1 / 2" },
    { label: "已切章节", value: "10" },
    { label: "蓝图状态", value: "未开始" },
  ]);
});

test("deriveProjectOverview returns blueprint confirmation summary when both books are analyzed", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [{ chapter_count: 10 }, { chapter_count: 12 }],
    bookSynthesisByBook: ["book-1", "book-2"],
    blueprintStatus: "draft",
    variants: [],
  });

  assert.equal(result.statusLabel, "等待确认蓝图");
  assert.equal(result.progressLabel, "两本参考小说已具备融合条件");
  assert.deepEqual(result.nextAction, {
    label: "进入工作台确认蓝图",
    href: "/sessions/session-1/workbench",
  });
  assert.deepEqual(result.editorialBullets, [
    "先锁定最值得保留的结构骨架，再决定生成方向。",
    "优先处理两书之间最强的互补点，而不是平均混合。",
    "确认蓝图后再开始生成，结果会更稳定。",
  ]);
  assert.deepEqual(result.keyResults, [
    { label: "参考小说", value: "2 / 2" },
    { label: "整书分析", value: "2 / 2" },
    { label: "蓝图状态", value: "待确认" },
  ]);
});

test("deriveProjectOverview returns results summary when confirmed blueprint already has variants", () => {
  const loaderCompatibleVariants: DualSessionPageData["variants"] = [
    {
      id: "variant-1",
      title: "Draft 1",
      scope: "full",
      config: {
        strategy: "balanced",
        innovation: 5,
        viewpoint: "keep",
        style: "keep",
        output_scope: "single-chapter",
        extra_instructions: "",
      },
      content: "content",
      word_count: 1000,
      blueprint_id: "blueprint-1",
      created_at: "2026-05-23T00:00:00.000Z",
    },
  ];

  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [{ chapter_count: 10 }, { chapter_count: 12 }],
    bookSynthesisByBook: ["book-1", "book-2"],
    blueprintStatus: "confirmed",
    variants: loaderCompatibleVariants,
  });

  assert.equal(result.statusLabel, "结果已生成");
  assert.equal(result.progressLabel, "已保存 1 个生成版本");
  assert.deepEqual(result.nextAction, {
    label: "查看生成结果",
    href: "/sessions/session-1?panel=results",
  });
  assert.deepEqual(result.editorialBullets, [
    "优先比较现有生成版本的骨架差异，再决定下一轮迭代。",
    "保留最稳定的融合骨架，避免每轮都重新发散。",
    "下一步更适合精修，而不是回到素材整理阶段。",
  ]);
  assert.deepEqual(result.keyResults, [
    { label: "参考小说", value: "2 / 2" },
    { label: "蓝图状态", value: "已确认" },
    { label: "生成版本", value: "1" },
  ]);
});

test("deriveProjectOverview ignores outline and chapter variants when deciding whether results exist", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [{ chapter_count: 10 }, { chapter_count: 12 }],
    bookSynthesisByBook: ["book-1", "book-2"],
    blueprintStatus: "confirmed",
    variants: [
      { id: "variant-outline", title: "Outline", scope: "outline" },
      { id: "variant-chapter", title: "Chapter 1", scope: "chapter" },
    ],
  });

  assert.equal(result.statusLabel, "可以开始生成");
  assert.equal(result.progressLabel, "融合蓝图已确认，等待首个版本输出");
  assert.deepEqual(result.nextAction, {
    label: "进入结果区开始生成",
    href: "/sessions/session-1?panel=results",
  });
  assert.deepEqual(result.keyResults, [
    { label: "参考小说", value: "2 / 2" },
    { label: "蓝图状态", value: "已确认" },
    { label: "生成版本", value: "0" },
  ]);
});

test("deriveProjectOverview does not unlock generation from blueprintConfirmedAt alone", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [{ chapter_count: 10 }, { chapter_count: 12 }],
    bookSynthesisByBook: ["book-1", "book-2"],
    blueprintStatus: "draft",
    variants: [{ id: "variant-1", title: "Draft 1", scope: "full" }],
  });

  assert.equal(result.statusLabel, "等待确认蓝图");
  assert.equal(result.progressLabel, "两本参考小说已具备融合条件");
  assert.deepEqual(result.nextAction, {
    label: "进入工作台确认蓝图",
    href: "/sessions/session-1/workbench",
  });
  assert.deepEqual(result.keyResults, [
    { label: "参考小说", value: "2 / 2" },
    { label: "整书分析", value: "2 / 2" },
    { label: "蓝图状态", value: "待确认" },
  ]);
});
