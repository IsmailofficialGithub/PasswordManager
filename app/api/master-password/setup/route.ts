import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { setMasterPassword } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    console.log("[Master Password Setup] Starting...");

    // Get cookies from request headers (more reliable in Next.js 15 API routes)
    const cookieHeader = request.headers.get('cookie') || '';
    console.log("[Master Password Setup] Cookie header:", cookieHeader ? "present" : "missing");

    // Parse cookies from header
    const cookiesMap = new Map<string, string>();
    if (cookieHeader) {
      cookieHeader.split('; ').forEach(cookie => {
        const [name, ...valueParts] = cookie.split('=');
        if (name) {
          cookiesMap.set(name, valueParts.join('='));
        }
      });
    }

    console.log("[Master Password Setup] Parsed cookies:", Array.from(cookiesMap.keys()));

    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookiesMap.get(name);
          },
          set(name: string, value: string, options: any) {
            cookiesMap.set(name, value);
          },
          remove(name: string, options: any) {
            cookiesMap.delete(name);
          },
        },
      }
    );

    // Get authenticated user
    console.log("[Master Password Setup] Getting user...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[Master Password Setup] User:", user ? user.id : "null");
    console.log("[Master Password Setup] Auth error:", authError);

    if (authError || !user) {
      console.error("[Master Password Setup] Authentication failed");
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

