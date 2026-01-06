import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

/**
 * Server-side login handler
 * Handles email/password authentication and sets session cookies properly
 */
export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and password are required" },
                { status: 400 }
            );
        }

        let response = NextResponse.json({ success: true });

        // Create Supabase client with proper cookie handling
        const supabase = createServerClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        );
                        response = NextResponse.json({ success: true });
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 401 }
            );
        }

        if (!data.session) {
            return NextResponse.json(
                { success: false, error: "Failed to create session" },
                { status: 500 }
            );
        }

        // Check if user has a master password set
        const { data: vaultUser } = await supabase
            .from("vault_users")
            .select("master_password_hash")
            .eq("user_id", data.user.id)
            .single();

        // Determine redirect URL based on master password status
        const redirectTo = vaultUser
            ? "/master-password" // Master password exists, unlock vault
            : "/master-password?setup=true"; // No master password, set it up

        // Return success with redirect URL
        // Cookies are already set in the response
        const responseWithCookies = NextResponse.json({
            success: true,
            redirectTo,
        });

        // Copy all cookies from the response object that was built during setAll
        response.cookies.getAll().forEach((cookie) => {
            responseWithCookies.cookies.set(cookie.name, cookie.value, cookie);
        });

        // Set a temporary flag to help middleware recognize freshly logged-in users
        responseWithCookies.cookies.set("just_logged_in", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 10, // Only valid for 10 seconds
            path: "/",
        });

        return responseWithCookies;
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}
