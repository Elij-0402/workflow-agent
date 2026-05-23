import { webcrypto } from "node:crypto";

/**
 * Server-side AES-GCM encryption for sensitive user data (API keys).
 * The encryption key is loaded from ENCRYPTION_KEY env var (32-byte base64).
 * Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * NEVER expose this module to the client bundle.
 */

const subtle = webcrypto.subtle;

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY env var is missing. Generate one with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const keyBytes = Buffer.from(raw, "base64");
  if (keyBytes.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes (base64-encoded), got ${keyBytes.length} bytes`
    );
  }
  cachedKey = await subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedKey;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return Buffer.concat([iv, new Uint8Array(ciphertext)]).toString("base64");
}

export async function decrypt(payload: string): Promise<string> {
  const key = await getKey();
  const data = Buffer.from(payload, "base64");
  if (data.length < 13) throw new Error("Invalid ciphertext payload");
  const iv = data.subarray(0, 12);
  const ciphertext = data.subarray(12);
  const plaintext = await subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}

/**
 * Returns a redacted preview of an API key (e.g. "sk-***...x9j2") suitable
 * for showing the user a hint of which key is stored without ever leaking it.
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "*".repeat(key.length);
  return `${key.slice(0, 3)}***${key.slice(-4)}`;
}
