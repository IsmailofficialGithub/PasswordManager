"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

function MasterPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSetup, setIsSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const setup = searchParams.get("setup") === "true";
    const locked = searchParams.get("locked") === "true";
    setIsSetup(setup);

    if (locked) {
      setError("Vault locked due to inactivity. Please enter your master password to unlock.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isSetup) {
      // Setup master password
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }

      if (password.length < 12) {
        setError("Master password must be at least 12 characters");
        setLoading(false);
        return;
      }

      try {
        // This will be handled server-side via API route
        const response = await fetch("/api/master-password/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to set master password");
        }

        // Wait for cookie to be set, then redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = "/vault";
      } catch (err: any) {
        setError(err.message || "Failed to set master password");
      } finally {
        setLoading(false);
      }
    } else {
      // Verify master password
      try {
        const response = await fetch("/api/master-password/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Invalid master password");
        }

        // Wait for cookie to be set, then redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        window.location.href = "/vault";
      } catch (err: any) {
        setError(err.message || "Invalid master password");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isSetup ? "Set Master Password" : "Unlock Vault"}
          </CardTitle>
          <CardDescription>
            {isSetup
              ? "Create a master password to encrypt your credentials. This is separate from your login password."
              : "Enter your master password to unlock the vault."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Master Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isSetup ? 12 : 1}
                  disabled={loading}
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {isSetup && (
                <p className="text-xs text-muted-foreground">
                  Must be at least 12 characters. This password cannot be recovered if lost.
                </p>
              )}
            </div>

            {isSetup && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Master Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? isSetup
                  ? "Setting up..."
                  : "Unlocking..."
                : isSetup
                  ? "Set Master Password"
                  : "Unlock Vault"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MasterPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <MasterPasswordForm />
    </Suspense>
  );
}

