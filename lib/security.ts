/**
 * Security utilities for rate limiting, input sanitization, and secure headers
 */

import { headers } from "next/headers";

/**
 * Rate limiting storage (in-memory for simplicity)
 * In production, use Redis or similar for distributed systems
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limit check
 * 
 * @param key - Unique identifier (e.g., user ID + action)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!record || record.resetAt < now) {
    // New or expired - create new record
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // Rate limited
  }

  // Increment count
  record.count++;
  return true;
}

/**
 * Get client IP address from request headers
 */
export async function getClientIp(): Promise<string | null> {
  const headersList = await headers();
  
  // Check various headers for real IP (behind proxy/load balancer)
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = headersList.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return null;
}

/**
 * Get user agent from request headers
 */
export async function getUserAgent(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get("user-agent");
}

/**
 * Sanitize input to prevent XSS
 * Basic sanitization - in production, use a library like DOMPurify
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim()
    .slice(0, 10000); // Max length
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Mask sensitive data for display
 */
export function maskSecret(secret: string, visibleChars: number = 4): string {
  if (!secret || secret.length <= visibleChars) {
    return "••••••";
  }
  return secret.slice(0, visibleChars) + "•".repeat(Math.min(secret.length - visibleChars, 20));
}

/**
 * Clear clipboard after timeout (client-side helper)
 * This is a utility function - actual implementation is client-side
 */
export function getClipboardClearScript(timeoutMs: number = 10000): string {
  return `
    (function() {
      const timeout = ${timeoutMs};
      let clipboardData = '';
      
      // Store clipboard before clearing
      navigator.clipboard.readText().then(text => {
        clipboardData = text;
        setTimeout(() => {
          navigator.clipboard.writeText('').catch(() => {});
        }, timeout);
      }).catch(() => {});
    })();
  `;
}

