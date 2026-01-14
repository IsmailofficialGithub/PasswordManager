/**
 * Rate limiting storage (in-memory for simplicity)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limit check
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 10000);
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
