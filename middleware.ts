import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "./lib/env";

/**
 * Middleware for authentication and route protection
 * 
 * Flow:
 * 1. Check Supabase auth session
 * 2. Check master password unlock state
 * 3. Protect /vault/* routes
 * 4. Redirect unauthenticated to /login
 * 5. Redirect authenticated but locked to /master-password
 */

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client for middleware
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes (no auth required)
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Auth routes (require auth but not master password)
  const authRoutes = ["/master-password"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Vault routes (require auth + master password unlock)
  const isVaultRoute = pathname.startsWith("/vault");

  // API routes
  const isApiRoute = pathname.startsWith("/api");

  // If not authenticated and trying to access protected route
  if (!user && (isVaultRoute || isAuthRoute)) {
    // Check if user just logged in (temporary cookie flag)
    const justLoggedIn = request.cookies.get("just_logged_in")?.value === "true";

    // If they just logged in, allow access to authRoute (master-password)
    // The session cookies should be available on the next request
    if (justLoggedIn && isAuthRoute) {
      // Clear the flag and allow access
      response.cookies.delete("just_logged_in");
      return response;
    }

    // Otherwise redirect to login
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated but on login/register, check master password status first
  if (user && isPublicRoute) {
    // Check if master password is set
    const { data: vaultUser } = await supabase
      .from("vault_users")
      .select("master_password_hash")
      .eq("user_id", user.id)
      .single();

    const unlocked = request.cookies.get("vault_unlocked")?.value === "true";

    if (!vaultUser) {
      // Master password not set - redirect to setup
      return NextResponse.redirect(
        new URL("/master-password?setup=true", request.url)
      );
    }

    if (!unlocked) {
      // Master password set but not unlocked - redirect to verification
      return NextResponse.redirect(new URL("/master-password", request.url));
    }

    // Master password unlocked - redirect to vault
    return NextResponse.redirect(new URL("/vault", request.url));
  }

  // Check master password unlock for vault routes
  if (user && isVaultRoute) {
    const unlocked = request.cookies.get("vault_unlocked")?.value === "true";

    if (!unlocked) {
      // Check if master password is set
      const { data: vaultUser } = await supabase
        .from("vault_users")
        .select("master_password_hash")
        .eq("user_id", user.id)
        .single();

      if (!vaultUser) {
        // Master password not set - redirect to setup
        return NextResponse.redirect(
          new URL("/master-password?setup=true", request.url)
        );
      }

      // Master password set but not unlocked - redirect to verification
      return NextResponse.redirect(new URL("/master-password", request.url));
    }
  }

  // Update activity timestamp for authenticated users
  if (user && (isVaultRoute || isAuthRoute)) {
    response.cookies.set("vault_last_activity", Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

