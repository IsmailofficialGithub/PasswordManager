import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { AUTH_SESSION_COOKIE } from "@/lib/supabase/server";

/**
 * Server-side login handler
 * Handles simple password authentication from env
 */
export async function POST(request: NextRequest) {
    try {
        const { password } = await request.json();

        if (!password) {
            return NextResponse.json(
                { success: false, error: "Password is required" },
                { status: 400 }
            );
        }

        // Check if password matches the one in environment
        if (password !== env.AUTH_PASSWORD) {
            return NextResponse.json(
                { success: false, error: "Invalid password" },
                { status: 401 }
            );
        }

        // Determine redirect URL
        // In single-user mode, we assume vault is always set up but needs unlock
        const redirectTo = "/master-password";

        const response = NextResponse.json({
            success: true,
            redirectTo,
        });

        // Set auth session cookie
        response.cookies.set(AUTH_SESSION_COOKIE, "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        });

        // Set a temporary flag to help middleware recognize freshly logged-in users
        response.cookies.set("just_logged_in", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 10, // Only valid for 10 seconds
            path: "/",
        });

        return response;
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}

