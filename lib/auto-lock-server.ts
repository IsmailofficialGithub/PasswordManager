/**
 * Server-side auto-lock functionality
 * Must only be imported in Server Components, Server Actions, or API routes
 */

import { lockVault } from "./auth";
import { cookies } from "next/headers";

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_COOKIE_NAME = "vault_last_activity";

/**
 * Get auto-lock timeout from environment or use default
 */
function getTimeoutMs(): number {
  const timeout = process.env.VAULT_AUTO_LOCK_TIMEOUT_MS;
  if (timeout) {
    const parsed = parseInt(timeout, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_TIMEOUT_MS;
}

/**
 * Update last activity timestamp
 * Call this on any user interaction (server-side)
 */
export async function updateActivity(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVITY_COOKIE_NAME, Date.now().toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

/**
 * Check if vault should be locked due to inactivity
 * Returns true if should be locked, false otherwise
 */
export async function shouldLock(): Promise<boolean> {
  const cookieStore = await cookies();
  const lastActivity = cookieStore.get(ACTIVITY_COOKIE_NAME);

  if (!lastActivity) {
    // No activity recorded - lock for safety
    return true;
  }

  const lastActivityMs = parseInt(lastActivity.value, 10);
  if (isNaN(lastActivityMs)) {
    return true;
  }

  const timeoutMs = getTimeoutMs();
  const elapsed = Date.now() - lastActivityMs;

  if (elapsed > timeoutMs) {
    // Timeout exceeded - lock vault
    await lockVault();
    return true;
  }

  return false;
}

