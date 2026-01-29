import { NextRequest, NextResponse } from "next/server";
import { updateActivity } from "@/lib/auto-lock-server";
import { AUTH_SESSION_COOKIE } from "@/lib/supabase/server";

/**
 * API endpoint to update activity timestamp
 * Called by client-side activity tracking
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication using cookie-based auth (same as middleware)
    const authCookie = request.cookies.get(AUTH_SESSION_COOKIE);
    const isAuthenticated = authCookie?.value === "true";
    
    if (!isAuthenticated) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    await updateActivity();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

