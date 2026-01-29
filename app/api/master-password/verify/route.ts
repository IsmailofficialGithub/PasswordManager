import { NextRequest, NextResponse } from "next/server";
import { verifyAndUnlock, setMasterPassword, hasMasterPassword } from "@/lib/auth";
import { rateLimitMasterPassword } from "@/lib/rate-limit";
import { AUTH_SESSION_COOKIE, SINGLE_USER_ID } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/security-server";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    // Check custom auth session (for single-user mode)
    const authCookie = request.cookies.get(AUTH_SESSION_COOKIE);
    const isAuthenticated = authCookie?.value === "true";

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Use single user ID for single-user mode
    const userId = SINGLE_USER_ID;

    // Rate limiting
    const ip = await getClientIp();
    if (!rateLimitMasterPassword(userId)) {
      return NextResponse.json(
        { success: false, error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password required" },
        { status: 400 }
      );
    }

    // Auto-initialize master password from env if not set (single-user mode)
    const masterPasswordSet = await hasMasterPassword(userId);
    if (!masterPasswordSet) {
      // Check if password matches the one from env
      if (password === env.MASTER_PASSWORD) {
        // Auto-setup the master password
        const setupResult = await setMasterPassword(userId, password);
        if (!setupResult.success) {
          return NextResponse.json(
            { success: false, error: setupResult.error || "Failed to initialize master password" },
            { status: 400 }
          );
        }
        // Continue to unlock after setup
      } else {
        return NextResponse.json(
          { success: false, error: "Master password not set. Please use the password from your environment configuration." },
          { status: 400 }
        );
      }
    }

    const result = await verifyAndUnlock(userId, password);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // Create response with cookie
    const response = NextResponse.json(result);

    // Ensure the unlock cookie is set in the response
    // (verifyAndUnlock already sets it, but we ensure it's in the response)
    response.cookies.set("vault_unlocked", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

