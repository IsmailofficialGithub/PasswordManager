import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "./lib/supabase/server";

/**
 * Middleware for authentication and route protection
 * 
 * Flow:
 * 1. Check custom auth session (from env-based login)
 * 2. Check master password unlock state
 * 3. Protect vault routes
 * 4. Redirect unauthenticated to /login
 * 5. Redirect authenticated but locked to /master-password
 */

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes (no auth required)
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Check custom auth session
  const isAuthenticated = request.cookies.get(AUTH_SESSION_COOKIE)?.value === "true";
  const unlocked = request.cookies.get("vault_unlocked")?.value === "true";

  // Auth routes (require auth but not master password)
  const authRoutes = ["/master-password"];
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // API routes
  const isApiRoute = pathname.startsWith("/api");

  // Vault routes (require auth + master password unlock)
  // Protect everything except public, auth, and api routes
  const isVaultRoute = pathname === "/" || (!isPublicRoute && !isAuthRoute && !isApiRoute);

  let response = NextResponse.next();

  // If not authenticated and trying to access protected route
  if (!isAuthenticated && (isVaultRoute || isAuthRoute)) {
    // Check if user just logged in (temporary cookie flag)
    const justLoggedIn = request.cookies.get("just_logged_in")?.value === "true";

    // If they just logged in, allow access to authRoute (master-password)
    if (justLoggedIn && isAuthRoute) {
      // Clear the flag and allow access
      response.cookies.set("just_logged_in", "", { maxAge: 0 });
      return response;
    }

    // Otherwise redirect to login
    const redirectUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      redirectUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated but on login/register, check master password status
  if (isAuthenticated && isPublicRoute) {
    if (!unlocked) {
      // Locked - redirect to verification
      return NextResponse.redirect(new URL("/master-password", request.url));
    }

    // Unlocked - redirect to vault
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Check master password unlock for vault routes
  if (isAuthenticated && isVaultRoute) {
    if (!unlocked) {
      // Locked - redirect to verification
      return NextResponse.redirect(new URL("/master-password", request.url));
    }
  }

  // Update activity timestamp for authenticated users
  if (isAuthenticated && (isVaultRoute || isAuthRoute)) {
    response.cookies.set("vault_last_activity", Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
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
