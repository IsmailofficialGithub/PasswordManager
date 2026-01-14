import { NextRequest, NextResponse } from "next/server";
import { setMasterPassword } from "@/lib/auth";
import { getServerUser } from "@/lib/supabase/server";

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

    const { password } = await request.json();

    if (!password || typeof password !== "string" || password.length < 12) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 12 characters" },
        { status: 400 }
      );
    }

    const result = await setMasterPassword(user.id, password);

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


