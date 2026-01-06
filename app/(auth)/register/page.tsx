"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  let supabase;
  try {
    supabase = createClient();
  } catch (err: any) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Configuration Error</CardTitle>
            <CardDescription>
              {err.message || "Missing Supabase configuration. Please check your environment variables."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/vault`,
        },
      });

      if (error) throw error;

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation required
        setSuccess(false);
        setError(
          "Email confirmation is enabled. Please check your email to confirm your account, " +
          "or disable email confirmation in Supabase Dashboard: " +
          "Authentication → Providers → Email → Confirm email (toggle OFF)"
        );
        setLoading(false);
        return;
      }

      // User is automatically signed in (email confirmation disabled)
      // Refresh auth state to ensure session is available
      await supabase!.auth.refreshSession();

      // Wait for session to be established by polling
      let sessionEstablished = false;
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        const { data: { session }, error: sessionError } = await supabase!.auth.getSession();
        if (session && !sessionError) {
          // Also check that we have a user
          const { data: { user } } = await supabase!.auth.getUser();
          if (user) {
            sessionEstablished = true;
            break;
          }
        }
      }

      if (!sessionEstablished) {
        setError("Account created, but session not established. Please try logging in.");
        return;
      }

      // Show success message
      setSuccess(true);
      setError("");

      // Wait for cookies to sync, then redirect with full page reload
      setTimeout(() => {
        // Use full page reload to ensure cookies are sent
        window.location.href = "/master-password?setup=true";
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Create a new account to start using Vault
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {success && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                Account created successfully! Redirecting to master password setup...
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

