import assert from "node:assert/strict";
import test from "node:test";

import type { DualSessionPageData } from "@/app/(app)/sessions/[id]/page-data";

import { deriveProjectOverview } from "./overview";

test("deriveProjectOverview returns upload-focused summary when only one book exists", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [{ chapter_count: 10, metadata: { ingest_status: "ready" } }],
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
});

test("deriveProjectOverview stays in import-health mode when one book is not ready", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [
      { chapter_count: 10, metadata: { ingest_status: "ready" } },
      { chapter_count: null, metadata: { ingest_status: "failed_needs_attention" } },
    ],
    bookSynthesisByBook: [],
    blueprintStatus: "draft",
    variants: [],
  });

  assert.equal(result.statusLabel, "等待文本整理");
  assert.equal(result.progressLabel, "已准备好 1 / 2 本参考小说");
  assert.deepEqual(result.nextAction, {
    label: "查看项目体检",
    href: "/sessions/session-1",
  });
});

test("deriveProjectOverview returns blueprint confirmation summary when both books are analyzed", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [
      { chapter_count: 10, metadata: { ingest_status: "ready" } },
      { chapter_count: 12, metadata: { ingest_status: "ready" } },
    ],
    bookSynthesisByBook: ["book-1", "book-2"],
    blueprintStatus: "draft",
    variants: [],
  });

  assert.equal(result.statusLabel, "等待确认蓝图");
  assert.equal(result.progressLabel, "两本参考小说已具备融合条件");
});

test("deriveProjectOverview returns analysis-focused summary when only one book has book synthesis", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [
      { chapter_count: 10, metadata: { ingest_status: "ready" } },
      { chapter_count: 12, metadata: { ingest_status: "ready" } },
    ],
    bookSynthesisByBook: ["book-1"],
    blueprintStatus: "draft",
    variants: [],
  });

  assert.equal(result.statusLabel, "等待完成分析");
  assert.equal(result.progressLabel, "已完成 1 / 2 本整书分析");
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
    books: [
      { chapter_count: 10, metadata: { ingest_status: "ready" } },
      { chapter_count: 12, metadata: { ingest_status: "ready" } },
    ],
    bookSynthesisByBook: ["book-1", "book-2"],
    blueprintStatus: "confirmed",
    variants: loaderCompatibleVariants,
  });

  assert.equal(result.statusLabel, "结果已生成");
  assert.equal(result.progressLabel, "已保存 1 个生成版本");
});

test("deriveProjectOverview ignores outline and chapter variants when deciding whether results exist", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [
      { chapter_count: 10, metadata: { ingest_status: "ready" } },
      { chapter_count: 12, metadata: { ingest_status: "ready" } },
    ],
    bookSynthesisByBook: ["book-1", "book-2"],
    blueprintStatus: "confirmed",
    variants: [
      { id: "variant-outline", title: "Outline", scope: "outline" },
      { id: "variant-chapter", title: "Chapter 1", scope: "chapter" },
    ],
  });

  assert.equal(result.statusLabel, "可以开始生成");
  assert.equal(result.progressLabel, "融合蓝图已确认，等待首个版本输出");
});

test("deriveProjectOverview does not unlock generation from blueprintConfirmedAt alone", () => {
  const result = deriveProjectOverview({
    sessionId: "session-1",
    books: [
      { chapter_count: 10, metadata: { ingest_status: "ready" } },
      { chapter_count: 12, metadata: { ingest_status: "ready" } },
    ],
    bookSynthesisByBook: ["book-1", "book-2"],
    blueprintStatus: "draft",
    variants: [{ id: "variant-1", title: "Draft 1", scope: "full" }],
  });

  assert.equal(result.statusLabel, "等待确认蓝图");
  assert.equal(result.progressLabel, "两本参考小说已具备融合条件");
});
