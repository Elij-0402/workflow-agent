import { expect, type Page } from "@playwright/test";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const DEFAULT_MODEL = "deepseek-chat";

const loginCredentials = {
  email: requireEnv("E2E_LOGIN_EMAIL"),
  password: requireEnv("E2E_LOGIN_PASSWORD"),
};

export async function login(page: Page) {
  await page.goto("/login");
  const form = page.locator("form");
  await page.getByLabel("邮箱", { exact: true }).fill(loginCredentials.email);
  await page.getByLabel("密码", { exact: true }).fill(loginCredentials.password);
  await form.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/(dashboard|sessions)$/);
}

export async function configureLlm(page: Page) {
  const llmCredentials = {
    baseUrl: requireEnv("E2E_LLM_BASE_URL"),
    apiKey: requireEnv("E2E_LLM_API_KEY"),
    model: process.env.E2E_LLM_MODEL?.trim() || DEFAULT_MODEL,
  };

  await page.goto("/settings");
  await page.getByLabel("Base URL", { exact: true }).fill(llmCredentials.baseUrl);
  await page.getByLabel("API Key", { exact: true }).fill(llmCredentials.apiKey);
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
    name: llmCredentials.model,
    exact: true,
  });

  if (await visibleModelOption.isVisible().catch(() => false)) {
    await visibleModelOption.click();
  } else {
    await manualEntryToggle.click();
    await page.locator('input[name="model"]').fill(llmCredentials.model);
  }

  await page.getByRole("button", { name: "保存配置", exact: true }).click();
  await expect(page.getByText("LLM 配置已保存。", { exact: true })).toBeVisible();
}
