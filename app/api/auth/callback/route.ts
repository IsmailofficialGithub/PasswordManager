import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth callback handler
 * Handles redirects from OAuth providers
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirect = requestUrl.searchParams.get("redirect") || "/";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Check if user has a master password set
    if (data?.user) {
      const { data: vaultUser } = await supabase
        .from("vault_users")
        .select("master_password_hash")
        .eq("user_id", data.user.id)
        .single();

      // Redirect based on master password status
      const redirectUrl = vaultUser
        ? "/master-password" // Master password exists, unlock vault
        : "/master-password?setup=true"; // No master password, set it up

      return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
    }
  }

  // Fallback redirect to vault (middleware will handle the rest)
  return NextResponse.redirect(new URL(redirect, requestUrl.origin));
}

