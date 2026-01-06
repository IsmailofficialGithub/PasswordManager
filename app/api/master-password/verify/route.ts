import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAndUnlock } from "@/lib/auth";
import { rateLimitMasterPassword } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client with proper cookie handling for API routes
    const cookieStore = await cookies();
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in API routes
            }
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

