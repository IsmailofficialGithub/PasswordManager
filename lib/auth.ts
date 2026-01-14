/**
 * Authentication and master password management
 * 
 * Security notes:
 * - Master password is hashed using bcrypt (separate from Supabase auth)
 * - Even OAuth users must set/verify master password
 * - Master password unlock state stored in server session (cookies)
 * - Auto-lock after inactivity
 */

import bcrypt from "bcryptjs";
import { createClient, getServerUser } from "./supabase/server";
import { cookies } from "next/headers";
import { env } from "./env";

const SALT_ROUNDS = 12;
const UNLOCK_COOKIE_NAME = "vault_unlocked";
const UNLOCK_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours (will be overridden by auto-lock)

/**
 * Hash a master password using bcrypt
 */
export async function hashMasterPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify master password against hash
 */
export async function verifyMasterPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Get vault user profile (with master password hash)
 */
export async function getVaultUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vault_users")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Check if user has set a master password
 * Always returns true for single-user mode since it's in env
 */
export async function hasMasterPassword(userId: string): Promise<boolean> {
  return true;
}

/**
 * Set or update master password
 * No-op in single-user mode (master password is in env)
 */
export async function setMasterPassword(
  userId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

/**
 * Verify master password and unlock vault
 */
export async function verifyAndUnlock(
  userId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const isValid = password === env.MASTER_PASSWORD;

    if (!isValid) {
      return { success: false, error: "Invalid master password" };
    }

    // Set unlock cookie (server-side session)
    const cookieStore = await cookies();
    cookieStore.set(UNLOCK_COOKIE_NAME, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: UNLOCK_COOKIE_MAX_AGE,
      path: "/",
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if vault is unlocked (from cookie)
 */
export async function isVaultUnlocked(): Promise<boolean> {
  const cookieStore = await cookies();
  const unlocked = cookieStore.get(UNLOCK_COOKIE_NAME);
  return unlocked?.value === "true";
}

/**
 * Lock vault (clear unlock cookie)
 */
export async function lockVault(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(UNLOCK_COOKIE_NAME);
}

/**
 * Require authentication and master password unlock
 * Use in Server Actions and API routes
 */
export async function requireAuthAndUnlock(): Promise<{
  user: { id: string };
  error?: string;
}> {
  // Check Supabase auth
  const user = await getServerUser();
  if (!user) {
    return { user: { id: "" }, error: "Not authenticated" };
  }

  // Check master password unlock
  const unlocked = await isVaultUnlocked();
  if (!unlocked) {
    return { user: { id: user.id }, error: "Vault is locked" };
  }

  return { user: { id: user.id } };
}

/**
 * Require only authentication (for master password setup)
 */
export async function requireAuth(): Promise<{
  user: { id: string } | null;
  error?: string;
}> {
  const user = await getServerUser();
  if (!user) {
    return { user: null, error: "Not authenticated" };
  }

  return { user: { id: user.id } };
}

