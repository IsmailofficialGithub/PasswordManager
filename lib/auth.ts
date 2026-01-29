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
import { createClient, getServerUser, AUTH_SESSION_COOKIE, SINGLE_USER_ID } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { cookies } from "next/headers";

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
 * Uses admin client to bypass RLS for single-user mode
 */
export async function getVaultUser(userId: string) {
  const supabase = createAdminClient();
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
 */
export async function hasMasterPassword(userId: string): Promise<boolean> {
  const vaultUser = await getVaultUser(userId);
  return !!vaultUser?.master_password_hash;
}

/**
 * Set or update master password
 */
export async function setMasterPassword(
  userId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const hash = await hashMasterPassword(password);
    const supabase = createAdminClient(); // Use admin client to bypass RLS

    // Check if user profile exists
    const existing = await getVaultUser(userId);

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("vault_users")
        .update({
          master_password_hash: hash,
          master_password_verified_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Create new
      const { error } = await supabase.from("vault_users").insert({
        user_id: userId,
        master_password_hash: hash,
        master_password_verified_at: new Date().toISOString(),
      });

      if (error) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify master password and unlock vault
 */
export async function verifyAndUnlock(
  userId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const vaultUser = await getVaultUser(userId);

    if (!vaultUser) {
      return { success: false, error: "Master password not set" };
    }

    const isValid = await verifyMasterPassword(
      password,
      vaultUser.master_password_hash
    );

    if (!isValid) {
      return { success: false, error: "Invalid master password" };
    }

    // Update verified timestamp
    const supabase = createAdminClient(); // Use admin client to bypass RLS
    await supabase
      .from("vault_users")
      .update({
        master_password_verified_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

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
 * Supports both Supabase auth and custom cookie-based auth (single-user mode)
 */
export async function requireAuthAndUnlock(): Promise<{
  user: { id: string };
  error?: string;
}> {
  try {
    console.log("[Auth] requireAuthAndUnlock called");
    // Check custom auth session (for single-user mode)
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(AUTH_SESSION_COOKIE);
    const isAuthenticated = authCookie?.value === "true";
    console.log("[Auth] isAuthenticated:", isAuthenticated);

    let userId: string | null = null;

    if (isAuthenticated) {
      // Use single user ID for custom auth
      userId = SINGLE_USER_ID;
      console.log("[Auth] Using single user ID:", userId);
    } else {
      // Fallback to Supabase auth (for multi-user mode)
      const user = await getServerUser();
      if (user) {
        userId = user.id;
        console.log("[Auth] Using Supabase user ID:", userId);
      }
    }

    if (!userId) {
      console.log("[Auth] No user ID found - not authenticated");
      return { user: { id: "" }, error: "Not authenticated" };
    }

    // Check master password unlock
    const unlocked = await isVaultUnlocked();
    console.log("[Auth] Vault unlocked:", unlocked);
    if (!unlocked) {
      console.log("[Auth] Vault is locked - returning error");
      return { user: { id: userId }, error: "Vault is locked" };
    }

    console.log("[Auth] Authentication and unlock successful");
    return { user: { id: userId } };
  } catch (error) {
    // If there's an error reading cookies, return not authenticated
    console.error("[Auth] Error in requireAuthAndUnlock:", error);
    return { user: { id: "" }, error: "Not authenticated" };
  }
}

/**
 * Require only authentication (for master password setup)
 * Supports both Supabase auth and custom cookie-based auth (single-user mode)
 */
export async function requireAuth(): Promise<{
  user: { id: string } | null;
  error?: string;
}> {
  // Check custom auth session (for single-user mode)
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_SESSION_COOKIE);
  const isAuthenticated = authCookie?.value === "true";

  if (isAuthenticated) {
    // Use single user ID for custom auth
    return { user: { id: SINGLE_USER_ID } };
  }

  // Fallback to Supabase auth (for multi-user mode)
  const user = await getServerUser();
  if (!user) {
    return { user: null, error: "Not authenticated" };
  }

  return { user: { id: user.id } };
}

