import test from "node:test";
import assert from "node:assert/strict";

// 32-byte base64 key, fixed for deterministic tests. The crypto module caches
// the imported key on first use, so all tests in this file MUST use the same
// key. Set BEFORE importing ./crypto.ts so the lazy getKey() picks it up.
const TEST_KEY = Buffer.from(new Uint8Array(32).fill(7)).toString("base64");
process.env.ENCRYPTION_KEY = TEST_KEY;

import { encrypt, decrypt, maskApiKey } from "./crypto.ts";

test("encrypt + decrypt round-trips a string", async () => {
  const plaintext = "sk-test-1234567890abcdef";
  const ciphertext = await encrypt(plaintext);

  assert.notEqual(ciphertext, plaintext);
  assert.ok(ciphertext.length > 0);

  const recovered = await decrypt(ciphertext);
  assert.equal(recovered, plaintext);
});

test("encrypt produces unique ciphertext per call (random IV)", async () => {
  const plaintext = "sk-deterministic";
  const a = await encrypt(plaintext);
  const b = await encrypt(plaintext);

  assert.notEqual(a, b);
  assert.equal(await decrypt(a), plaintext);
  assert.equal(await decrypt(b), plaintext);
});

test("encrypt + decrypt round-trips multi-byte UTF-8 (Chinese)", async () => {
  const plaintext = "测试中文 API key 🔑";
  const ciphertext = await encrypt(plaintext);
  const recovered = await decrypt(ciphertext);
  assert.equal(recovered, plaintext);
});

test("decrypt rejects a tampered GCM tag", async () => {
  const plaintext = "sk-original";
  const ciphertext = await encrypt(plaintext);

  // Flip the last byte (which lives in the GCM auth tag region).
  const bytes = Buffer.from(ciphertext, "base64");
  bytes[bytes.length - 1] = bytes[bytes.length - 1] ^ 0xff;
  const tampered = bytes.toString("base64");

  await assert.rejects(() => decrypt(tampered));
});

test("decrypt rejects a payload shorter than IV + tag", async () => {
  const short = Buffer.from(new Uint8Array(10)).toString("base64");
  await assert.rejects(() => decrypt(short), /Invalid ciphertext payload/);
});

test("decrypt rejects empty string", async () => {
  await assert.rejects(() => decrypt(""), /Invalid ciphertext payload/);
});

test("maskApiKey shows first 3 and last 4 chars of a normal key", () => {
  assert.equal(maskApiKey("sk-abcdefghij1234"), "sk-***1234");
});

test("maskApiKey fully masks short strings (<= 8 chars)", () => {
  assert.equal(maskApiKey("12345678"), "********");
  assert.equal(maskApiKey("abc"), "***");
});

test("maskApiKey handles empty input", () => {
  assert.equal(maskApiKey(""), "");
});
