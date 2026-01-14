import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/supabase/server";

export async function POST() {
    const response = NextResponse.json({ success: true });

    // Clear session cookies
    response.cookies.delete(AUTH_SESSION_COOKIE);
    response.cookies.delete("vault_unlocked");

    return response;
}
