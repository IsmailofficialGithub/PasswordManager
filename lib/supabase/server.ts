import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../env";

export const SINGLE_USER_ID = "00000000-0000-0000-0000-000000000001";
export const AUTH_SESSION_COOKIE = "auth_session";

/**
 * Server-side Supabase client
 * Uses cookies for session management
 * Safe to use in Server Components and Server Actions
 */
export async function createClient() {
  const cookieStore = await cookies();

  // Use service role key to bypass RLS as we handle auth via env
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
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
            // Ignore errors if called from Server Component
          }
        },
      },
    }
  );
}


/**
 * Get authenticated user from server-side session
 * Returns a fixed user ID if environment-based auth matches
 */
export async function getServerUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_SESSION_COOKIE);

  if (session?.value === "true") {
    return {
      id: SINGLE_USER_ID,
      email: "admin@local",
    };
  }

  // Fallback to Supabase auth (for transition or if still used)
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

