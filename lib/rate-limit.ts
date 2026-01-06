/**
 * Rate limiting utilities
 * Prevents brute force attacks and abuse
 */

import { checkRateLimit } from "./security";

// Re-export for convenience
export { checkRateLimit };

/**
 * Rate limit login attempts
 * 5 attempts per 15 minutes per IP
 */
export function rateLimitLogin(ip: string): boolean {
  return checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
}

/**
 * Rate limit master password verification
 * 10 attempts per 15 minutes per user
 */
export function rateLimitMasterPassword(userId: string): boolean {
  return checkRateLimit(`master_password:${userId}`, 10, 15 * 60 * 1000);
}

/**
 * Rate limit decryption requests
 * 10 requests per minute per user
 */
export function rateLimitDecryption(userId: string): boolean {
  return checkRateLimit(`decrypt:${userId}`, 10, 60 * 1000);
}

/**
 * Rate limit credential creation
 * 50 creations per hour per user
 */
export function rateLimitCredentialCreation(userId: string): boolean {
  return checkRateLimit(`create_credential:${userId}`, 50, 60 * 60 * 1000);
}

