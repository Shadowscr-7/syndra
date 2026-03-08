// ============================================================
// AES-256-GCM Encryption Utility
// ============================================================
// Used to encrypt/decrypt user credentials (API keys, tokens, etc.)
// The encryption key is derived from CREDENTIALS_SECRET env var.
// Each encrypted payload includes a random IV + auth tag for integrity.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = 'syndra-credentials-v1'; // static salt — key uniqueness comes from CREDENTIALS_SECRET

/**
 * Derive a 256-bit key from the secret using scrypt.
 * Caches derived key per secret value for performance.
 */
const keyCache = new Map<string, Buffer>();
function deriveKey(secret: string): Buffer {
  if (keyCache.has(secret)) return keyCache.get(secret)!;
  const key = scryptSync(secret, SALT, KEY_LENGTH);
  keyCache.set(secret, key);
  return key;
}

function getSecret(): string {
  const secret = process.env.CREDENTIALS_SECRET || process.env.JWT_SECRET || 'dev-credentials-secret-change-in-production';
  return secret;
}

/**
 * Encrypt a plain-text string using AES-256-GCM.
 * Returns a base64 string: iv(16) + tag(16) + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = deriveKey(getSecret());
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack: iv + tag + ciphertext
  const packed = Buffer.concat([iv, tag, encrypted]);
  return packed.toString('base64');
}

/**
 * Decrypt a base64 string produced by encrypt().
 * Returns the original plain-text string.
 */
export function decrypt(encryptedBase64: string): string {
  const key = deriveKey(getSecret());
  const packed = Buffer.from(encryptedBase64, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Encrypt a JSON-serializable object.
 */
export function encryptJson(data: Record<string, any>): string {
  return encrypt(JSON.stringify(data));
}

/**
 * Decrypt back to a parsed JSON object.
 */
export function decryptJson<T = Record<string, any>>(encryptedBase64: string): T {
  return JSON.parse(decrypt(encryptedBase64));
}

/**
 * Mask a secret string showing only last N characters.
 * e.g. maskSecret("sk-abc123def456", 4) → "••••••••••f456"
 */
export function maskSecret(value: string, showLast = 4): string {
  if (!value || value.length <= showLast) return '••••';
  return '•'.repeat(Math.min(value.length - showLast, 20)) + value.slice(-showLast);
}
