import { z } from "zod";

// Environment variable schema
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  VAULT_ENCRYPTION_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

// Parse and validate environment variables
function getEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VAULT_ENCRYPTION_KEY: process.env.VAULT_ENCRYPTION_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  return parsed.data;
}

// Get encryption key with dev fallback
export function getEncryptionKey(): string {
  const env = getEnv();
  
  if (env.VAULT_ENCRYPTION_KEY) {
    return env.VAULT_ENCRYPTION_KEY;
  }

  // Dev fallback with warning
  if (env.NODE_ENV === "development") {
    console.warn(
      "⚠️  WARNING: VAULT_ENCRYPTION_KEY not set. Using development fallback key. " +
      "This is INSECURE and should NEVER be used in production!"
    );
    // 32-byte hex string for development only
    return "dev-fallback-key-32-bytes-hex-string-not-secure";
  }

  throw new Error(
    "VAULT_ENCRYPTION_KEY is required in production. " +
    "Generate one with: openssl rand -hex 32"
  );
}

// Type-safe environment access
export const env = getEnv();

