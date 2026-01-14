import { headers } from "next/headers";

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
