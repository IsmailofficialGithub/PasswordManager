import { NextRequest, NextResponse } from "next/server";
import { setMasterPassword } from "@/lib/auth";
import { AUTH_SESSION_COOKIE, SINGLE_USER_ID } from "@/lib/supabase/server";

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

    const { password } = await request.json();

    if (!password || typeof password !== "string" || password.length < 12) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 12 characters" },
        { status: 400 }
      );
    }

    // Use single user ID for single-user mode
    const userId = SINGLE_USER_ID;
    const result = await setMasterPassword(userId, password);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    // Set unlock cookie after successful master password setup
    const response = NextResponse.json(result);
    response.cookies.set("vault_unlocked", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Master password setup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


