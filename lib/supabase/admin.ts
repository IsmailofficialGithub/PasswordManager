import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

/**
 * Admin Supabase client with service role key
 * WARNING: Only use in secure server-side contexts
 * Bypasses RLS - use with extreme caution
 */
export function createAdminClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

