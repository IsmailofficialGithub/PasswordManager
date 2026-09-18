"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { maskSecret } from "@/lib/security";
import { MasterPasswordPrompt } from "./master-password-prompt";

interface PasswordRevealProps {
  encryptedSecret: string;
  credentialId: string;
  onDecrypt: (credentialId: string) => Promise<{ success: boolean; secret?: string; error?: string }>;
  isMultiline?: boolean;
}

const AUTO_LOCK_DURATION = 60000; // 1 minute in milliseconds

// Client-side API fetch for decryption to prevent Next.js Server Action page revalidation and state wipe
async function fetchDecryptApi(credentialId: string): Promise<{ success: boolean; secret?: string; error?: string }> {
  try {
    const res = await fetch("/api/decrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentialId }),
    });
    return await res.json();
  } catch (err) {
    return { success: false, error: "Network error during decryption" };
  }
}

export function PasswordReveal({
  encryptedSecret,
  credentialId,
  onDecrypt,
  isMultiline = false,
}: PasswordRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showMasterPasswordPrompt, setShowMasterPasswordPrompt] = useState(false);
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }
    };
  }, []);

  // Auto-lock function to hide password after 1 minute
  const startAutoLockTimer = () => {
    // Clear any existing timer
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }

    // Set new timer to auto-lock after 1 minute
    autoLockTimerRef.current = setTimeout(() => {
      setRevealed(false);
      setSecret(null);
      setError("");
      setCopied(false);
    }, AUTO_LOCK_DURATION);
  };

  const handleReveal = async () => {
    if (secret) {
      // If already decrypted, just toggle visibility
      setRevealed(!revealed);

      // If showing again, restart the auto-lock timer
      if (!revealed) {
        startAutoLockTimer();
      }
      return;
    }

    // Require master password verification before decrypting
    setShowMasterPasswordPrompt(true);
  };

  const handleMasterPasswordVerified = async () => {
    setLoading(true);
    setError("");

    // Fetch via API route to avoid Next.js Server Action page revalidation state wipe
    const result = await fetchDecryptApi(credentialId);
    if (result.success && result.secret) {
      setSecret(result.secret);
      setRevealed(true);
      // Start the 1-minute auto-lock timer
      startAutoLockTimer();
    } else {
      setError(result.error || "Failed to decrypt");
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!secret) return;

    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);

      // Clear clipboard after 10 seconds
      setTimeout(async () => {
        try {
          await navigator.clipboard.writeText("");
        } catch {
          // Ignore clipboard clear errors
        }
      }, 10000);

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);

      // Restart auto-lock timer on copy (user is actively using it)
      startAutoLockTimer();
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  if (!encryptedSecret) {
    return <span className="text-muted-foreground">No secret stored</span>;
  }

  return (
    <>
      <div className={`flex ${isMultiline && revealed && secret ? "flex-col items-start w-full" : "items-center min-w-0 flex-wrap"} gap-2`}>
        {isMultiline && revealed && secret ? (
          <pre className="font-mono text-sm bg-muted p-3 rounded-md w-full overflow-x-auto whitespace-pre-wrap break-all">
            {secret}
          </pre>
        ) : (
          <span className="font-mono text-sm break-all max-w-full">
            {revealed && secret ? secret : maskSecret("••••••••", 0)}
          </span>
        )}
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleReveal}
            disabled={loading}
            title={secret ? (revealed ? "Hide password" : "Show password") : "Verify master password to view"}
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin">⟳</span>
            ) : revealed ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          {revealed && secret && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
              title="Copy to clipboard (clears after 10s)"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>

      <MasterPasswordPrompt
        open={showMasterPasswordPrompt}
        onOpenChange={setShowMasterPasswordPrompt}
        onVerified={handleMasterPasswordVerified}
      />
    </>
  );
}

