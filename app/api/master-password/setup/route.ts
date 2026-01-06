import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { setMasterPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await requireAuth();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: authError || "Not authenticated" },
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

    return NextResponse.json(result);
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

