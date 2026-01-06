import crypto from "crypto";
import { getEncryptionKey } from "./env";

/**
 * Encryption utilities using AES-256-GCM
 * 
 * Security notes:
 * - GCM mode provides authenticated encryption (prevents tampering)
 * - Each encryption uses a unique IV (initialization vector)
 * - IV is prepended to the ciphertext for storage
 * - Key is derived from environment variable (never hardcoded)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits authentication tag
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * Converts hex string to Buffer
 */
function getKey(): Buffer {
  const keyHex = getEncryptionKey();
  
  // Validate key length (should be 64 hex chars = 32 bytes)
  if (keyHex.length !== 64) {
    throw new Error(
      `Invalid encryption key length. Expected 64 hex characters (32 bytes), got ${keyHex.length}. ` +
      `Generate with: openssl rand -hex 32`
    );
  }

  try {
    return Buffer.from(keyHex, "hex");
  } catch (error) {
    throw new Error(`Failed to parse encryption key: ${error}`);
  }
}

/**
 * Encrypt plaintext using AES-256-GCM
 * 
 * @param plaintext - The secret to encrypt
 * @returns Base64-encoded string: IV + AuthTag + Ciphertext
 * 
 * Format: [IV (16 bytes)][AuthTag (16 bytes)][Ciphertext (variable)]
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty string");
  }

  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine: IV + AuthTag + Ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);

    // Return as base64 for storage
    return combined.toString("base64");
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM
 * 
 * @param encryptedData - Base64-encoded encrypted data
 * @returns Decrypted plaintext string
 * 
 * @throws Error if decryption fails (corrupted data, wrong key, tampering)
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error("Cannot decrypt empty string");
  }

  try {
    const key = getKey();
    const combined = Buffer.from(encryptedData, "base64");

    // Validate minimum length
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted data: too short");
    }

    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    // Decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    // Don't leak details about decryption failures
    if (error instanceof Error && error.message.includes("Unsupported state")) {
      throw new Error("Decryption failed: Invalid key or corrupted data");
    }
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Generate a secure random string
 * Useful for generating API keys, tokens, etc.
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Hash a value using SHA-256 (one-way, for non-sensitive hashing)
 * Note: This is NOT for passwords - use bcrypt for that
 */
export function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

