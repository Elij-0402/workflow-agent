import path from "node:path";
import { expect, test } from "@playwright/test";

import { login } from "./helpers/auth";
import { resolveUploadFixturePaths } from "./helpers/upload-fixtures";

const [singleFile] = resolveUploadFixturePaths(1);
const [fileA, fileB] = resolveUploadFixturePaths(2);
const [tripleA, tripleB, tripleC] = resolveUploadFixturePaths(3);
const dualUploadPath = "/upload?mode=dual";

test.describe("dual upload branches", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(dualUploadPath);
  });

  test("blocks submission when only one file is selected", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles(singleFile);

    await expect(page.getByText(path.basename(singleFile), { exact: false })).toBeVisible();
    await expect(
      page.getByText("创建双书融合任务需要两本参考小说。", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "创建并进入工作台", exact: true }),
    ).toBeDisabled();
  });

  test("blocks submission when three files are selected", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles([tripleA, tripleB, tripleC]);

    await expect(
      page.getByText(/当前每个任务最多支持 2 本参考小说/, { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "创建并进入工作台", exact: true }),
    ).toBeDisabled();
  });

  test("allows submission when exactly two files are selected", async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles([fileA, fileB]);

    await expect(page.getByRole("heading", { name: "参考书 1", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "参考书 2", exact: true })).toBeVisible();
    await expect(page.getByText(path.basename(fileA), { exact: false })).toBeVisible();
    await expect(page.getByText(path.basename(fileB), { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "创建并进入工作台", exact: true }).click();
    await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/, { timeout: 30_000 });
  });
});
