import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const DEFAULT_MODEL = "deepseek-chat";
const uploadFile = path.resolve(process.cwd(), "tests/e2e/fixtures/smoke-test-novel.txt");
const ANALYSIS_COMPLETE_TEXT = "三项分析已经完成。需要时可以单独重跑某一项。";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const credentials = {
  email: requireEnv("E2E_LOGIN_EMAIL"),
  password: requireEnv("E2E_LOGIN_PASSWORD"),
  baseUrl: requireEnv("E2E_LLM_BASE_URL"),
  apiKey: requireEnv("E2E_LLM_API_KEY"),
  model: process.env.E2E_LLM_MODEL?.trim() || DEFAULT_MODEL,
};

async function finishAnalyses(page: Page) {
  const doneText = page.getByText(ANALYSIS_COMPLETE_TEXT, { exact: true });
  const analyzeStart = page.getByRole("button", {
    name: "开始分析",
    exact: true,
  });
  const analyzeContinue = page.getByRole("button", {
    name: "继续分析",
    exact: true,
  });
  const deadline = Date.now() + 8 * 60 * 1000;

  while (Date.now() < deadline) {
    if (await doneText.isVisible().catch(() => false)) {
      return;
    }

    if (
      (await analyzeStart.isVisible().catch(() => false)) &&
      (await analyzeStart.isEnabled().catch(() => false))
    ) {
      await analyzeStart.click();
      await page.waitForTimeout(2_000);
      continue;
    }

    if (
      (await analyzeContinue.isVisible().catch(() => false)) &&
      (await analyzeContinue.isEnabled().catch(() => false))
    ) {
      await analyzeContinue.click();
      await page.waitForTimeout(2_000);
      continue;
    }

    await page.waitForTimeout(3_000);
  }

  await expect(doneText).toBeVisible();
}

test("smoke flow: login, configure, upload, analyze, and generate", async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);

  await page.goto("/login");
  await page.getByLabel("邮箱", { exact: true }).fill(credentials.email);
  await page.getByLabel("密码", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/settings");
  await page.getByLabel("Base URL", { exact: true }).fill(credentials.baseUrl);
  await page.getByLabel("API Key", { exact: true }).fill(credentials.apiKey);
  await page.getByRole("button", { name: "获取可用模型", exact: true }).click();

  const modelToast = page.getByText("已获取", { exact: false });
  const modelFetchFailed = page.getByText("无法连接到该接口，请检查 Base URL。", {
    exact: true,
  });
  await Promise.race([
    modelToast.waitFor({ state: "visible", timeout: 20_000 }),
    modelFetchFailed.waitFor({ state: "visible", timeout: 20_000 }),
  ]).catch(() => undefined);

  const manualEntryToggle = page.getByRole("button", {
    name: "endpoint 不支持？手动输入",
    exact: true,
  });
  const visibleModelOption = page.getByRole("option", {
    name: credentials.model,
    exact: true,
  });

  if (await visibleModelOption.isVisible().catch(() => false)) {
    await visibleModelOption.click();
  } else {
    await manualEntryToggle.click();
    await page.locator('input[name="model"]').fill(credentials.model);
  }

  await page.getByRole("button", { name: "保存配置", exact: true }).click();
  await expect(page.getByText("LLM 配置已保存。", { exact: true })).toBeVisible();

  await page.goto("/upload");
  await page.locator('input[type="file"]').setInputFiles(uploadFile);
  await expect(page.getByText("smoke-test-novel.txt", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "开始任务", exact: true }).click();

  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "smoke-test-novel" })).toBeVisible();

  await finishAnalyses(page);

  await page.getByRole("button", { name: "生成结果", exact: true }).click();
  await expect(page.getByRole("heading", { name: "已生成结果", exact: true })).toBeVisible({
    timeout: 5 * 60 * 1000,
  });
  await expect(page.locator("article.reading-prose")).toBeVisible();
});
