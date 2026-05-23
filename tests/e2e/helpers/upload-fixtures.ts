import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const preferDocsFixtures = process.env.E2E_USE_DOCS_FIXTURES === "1";

const docsPreferred = [
  path.resolve(root, "docs", "1508.txt"),
  path.resolve(root, "docs", "《斗破苍穹》小说全集txt版.txt"),
];

const fallbackFiles = [
  path.resolve(root, "tests/e2e/fixtures/smoke-test-novel.txt"),
  path.resolve(root, "tests/e2e/fixtures/dual-upload-book-2.txt"),
  path.resolve(root, "tests/e2e/fixtures/dual-upload-book-3.txt"),
];

export function resolveUploadFixturePaths(count: 1 | 2 | 3): string[] {
  const docs = docsPreferred.filter((filePath) => fs.existsSync(filePath));
  const merged = preferDocsFixtures
    ? [...docs, ...fallbackFiles]
    : [...fallbackFiles, ...docs];
  const seen = new Set<string>();
  const unique = merged.filter((filePath) => {
    if (seen.has(filePath)) return false;
    seen.add(filePath);
    return true;
  });

  if (unique.length < count) {
    throw new Error(`Not enough upload fixtures to satisfy count=${count}.`);
  }

  return unique.slice(0, count);
}
