import { NextRequest, NextResponse } from "next/server";
import { verifyAndUnlock } from "@/lib/auth";
import { rateLimitMasterPassword } from "@/lib/rate-limit";
import { getServerUser } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/security-server";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }


    // Rate limiting
    const ip = await getClientIp();
    if (!rateLimitMasterPassword(user.id)) {
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

    const result = await verifyAndUnlock(user.id, password);

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

