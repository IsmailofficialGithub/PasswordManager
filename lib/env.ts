import { z } from "zod";

// Environment variable schema
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  VAULT_ENCRYPTION_KEY: z.string().optional(),
  AUTH_PASSWORD: z.string().min(1),
  MASTER_PASSWORD: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Parse and validate environment variables
function getEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VAULT_ENCRYPTION_KEY: process.env.VAULT_ENCRYPTION_KEY,
    AUTH_PASSWORD: process.env.AUTH_PASSWORD,
    MASTER_PASSWORD: process.env.MASTER_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    // In development, providing defaults if missing to avoid complete crash
    if (process.env.NODE_ENV === "development") {
      console.error("❌ Invalid environment variables:", parsed.error.message);
      return {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        VAULT_ENCRYPTION_KEY: process.env.VAULT_ENCRYPTION_KEY,
        AUTH_PASSWORD: process.env.AUTH_PASSWORD || "admin123", // Dev fallback
        MASTER_PASSWORD: process.env.MASTER_PASSWORD || "master12345678", // Dev fallback
        NODE_ENV: "development",
      } as any;
    }
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  return parsed.data;
}

// Get encryption key with dev fallback
export function getEncryptionKey(): string {
  const env = getEnv();

  // If key provided and valid length, use it
  if (env.VAULT_ENCRYPTION_KEY && env.VAULT_ENCRYPTION_KEY.length === 64) {
    return env.VAULT_ENCRYPTION_KEY;
  }

  // Dev fallback with warning if key is missing or invalid length
  if (env.NODE_ENV === "development") {
    if (env.VAULT_ENCRYPTION_KEY) {
      console.warn(
        `⚠️  WARNING: VAULT_ENCRYPTION_KEY has invalid length (${env.VAULT_ENCRYPTION_KEY.length}). ` +
        `Expected 64 hex characters. Using development fallback key.`
      );
    } else {
      console.warn(
        "⚠️  WARNING: VAULT_ENCRYPTION_KEY not set. Using development fallback key. " +
        "This is INSECURE and should NEVER be used in production!"
      );
    }
    // 64-char hex string for development only
    return "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  }

  // In production, require a valid key
  if (!env.VAULT_ENCRYPTION_KEY) {
    throw new Error(
      "VAULT_ENCRYPTION_KEY is required in production. " +
      "Generate one with: openssl rand -hex 32"
    );
  }

  if (env.VAULT_ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      `Invalid VAULT_ENCRYPTION_KEY length (${env.VAULT_ENCRYPTION_KEY.length}). ` +
      `Expected 64 hex characters (32 bytes).`
    );
  }

  return env.VAULT_ENCRYPTION_KEY;
}

// Type-safe environment access
export const env = getEnv();

