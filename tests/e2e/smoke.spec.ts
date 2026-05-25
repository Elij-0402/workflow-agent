import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { configureLlm, login } from "./helpers/auth";
import { resolveUploadFixturePaths } from "./helpers/upload-fixtures";

const [uploadFileA, uploadFileB] = resolveUploadFixturePaths(2);
const env = Object.fromEntries(
  fs
    .readFileSync(path.resolve(process.cwd(), ".env"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);
const dualUploadPath = "/upload?mode=dual";

async function finishAnalyses(page: Page) {
  const sessionId = page.url().match(/\/sessions\/([0-9a-f-]+)/)?.[1];
  if (!sessionId) {
    throw new Error(`Could not extract session id from ${page.url()}`);
  }

  const { data: books } = await admin
    .from("books")
    .select("id, position")
    .eq("session_id", sessionId)
    .order("position", { ascending: true });
  if (!books || books.length !== 2) {
    throw new Error(
      `Expected 2 books for ${sessionId}, got ${books?.length ?? 0}`,
    );
  }

  for (const book of books) {
    const { data: chapters } = await admin
      .from("chapters")
      .select("id")
      .eq("book_id", book.id)
      .order("index", { ascending: true });
    if (!chapters || chapters.length === 0) {
      throw new Error(`No chapters found for book ${book.id}`);
    }

    for (const chapter of chapters) {
      const response = await page.request.post("/api/analyze/chapter", {
        data: {
          bookId: book.id,
          chapterId: chapter.id,
        },
        timeout: 180_000,
      });
      const payload = (await response.json()) as { ok?: true; error?: string };
      expect(
        response.ok(),
        payload.error ?? "chapter analysis failed",
      ).toBeTruthy();
    }

    const synthResponse = await page.request.post("/api/analyze/book", {
      data: { bookId: book.id },
      timeout: 180_000,
    });
    const synthPayload = (await synthResponse.json()) as {
      ok?: true;
      error?: string;
    };
    expect(
      synthResponse.ok(),
      synthPayload.error ?? "book synthesis failed",
    ).toBeTruthy();
  }

  await page.reload();
  const compareHeading = page.getByRole("heading", {
    name: "第 3 步 · 对比并整理骨架",
    exact: true,
  });
  if (await compareHeading.isVisible().catch(() => false)) {
    return;
  }

  await expect(
    page.getByRole("button", { name: "前往对比", exact: true }),
  ).toBeEnabled({ timeout: 60_000 });
}

async function seedAndConfirmBlueprint(page: Page) {
  const sessionId = page.url().match(/\/sessions\/([0-9a-f-]+)/)?.[1];
  if (!sessionId) {
    throw new Error(`Could not extract session id from ${page.url()}`);
  }

  const blueprint = {
    characters: [
      {
        id: randomUUID(),
        notes: "",
        sources: [],
        name: "林岚",
        role: "主角",
        traits: ["冷静", "执拗"],
        description: "在双重世界规则之间寻找平衡的核心人物。",
      },
    ],
    relationships: [
      {
        id: randomUUID(),
        notes: "",
        sources: [],
        from: "林岚",
        to: "苏曜",
        type: "盟友",
        description: "在共同试炼中逐步建立互信。",
      },
    ],
    world_rules: [
      {
        id: randomUUID(),
        notes: "",
        sources: [],
        rule: "灵能共鸣",
        description: "角色的情绪会放大法则波动，并影响场景难度。",
      },
    ],
    conflicts: [
      {
        id: randomUUID(),
        notes: "",
        sources: [],
        title: "继承与背叛",
        description: "主角必须在两套传承之间做出代价高昂的选择。",
      },
    ],
    plot_beats: [
      {
        id: randomUUID(),
        notes: "",
        sources: [],
        title: "试炼开启",
        description: "两本参考书的关键事件被并置为同一次入局考验。",
        order: 1,
      },
    ],
    viewpoint: {
      mode: "双主角近距离跟随",
      pacing: "前紧后稳",
      notes: "保持章节推进感，把信息揭示留到冲突后半段。",
    },
    themes: [
      {
        id: randomUUID(),
        notes: "",
        sources: [],
        theme: "代价与成长",
      },
    ],
  };

  const saveResponse = await page.request.patch("/api/blueprint", {
    data: {
      sessionId,
      patch: blueprint,
      expectedUpdatedAt: null,
    },
  });
  expect(saveResponse.ok()).toBeTruthy();

  const confirmResponse = await page.request.post("/api/blueprint/confirm", {
    data: { sessionId },
  });
  expect(confirmResponse.ok()).toBeTruthy();
}

test("smoke flow: login, configure, upload, analyze, and generate", async ({
  page,
}) => {
  test.setTimeout(15 * 60 * 1000);

  await login(page);
  await configureLlm(page);

  await page.goto(dualUploadPath);
  await page
    .locator('input[type="file"]')
    .setInputFiles([uploadFileA, uploadFileB]);
  await expect(
    page.getByText(path.basename(uploadFileA), { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText(path.basename(uploadFileB), { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "创建并进入工作台", exact: true })
    .click();

  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/, {
    timeout: 30_000,
  });
  const overviewUrl = page.url();
  await page.goto(`${overviewUrl}/workbench`);
  await expect(
    page.getByRole("heading", {
      name: "第 2 步 · 分析两本参考小说",
      exact: true,
    }),
  ).toBeVisible();

  await finishAnalyses(page);

  const compareHeading = page.getByRole("heading", {
    name: "第 3 步 · 对比并整理骨架",
    exact: true,
  });
  if (!(await compareHeading.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "前往对比", exact: true }).click();
    await expect(compareHeading).toBeVisible();
  }

  await seedAndConfirmBlueprint(page);
  await page.reload();

  const generateHeading = page.getByRole("heading", {
    name: "第 4 步 · 生成新小说",
    exact: true,
  });
  if (!(await generateHeading.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: "前往生成", exact: true }).click();
    await expect(generateHeading).toBeVisible();
  }

  await page.getByRole("button", { name: "生成新小说", exact: true }).click();
  await page.getByRole("button", { name: "生成新版本", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "生成结果", exact: true }),
  ).toBeVisible({ timeout: 5 * 60 * 1000 });
  await expect(
    page.getByRole("button", { name: "再生成一版", exact: true }),
  ).toBeVisible({
    timeout: 5 * 60 * 1000,
  });
  await page
    .getByRole("button", { name: "阅读全文 →", exact: true })
    .first()
    .click();
  await expect(page.locator("article.reading-prose")).toBeVisible({
    timeout: 30_000,
  });
});
