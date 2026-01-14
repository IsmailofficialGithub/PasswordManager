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
}

const AUTO_LOCK_DURATION = 60000; // 1 minute in milliseconds

export function PasswordReveal({
  encryptedSecret,
  credentialId,
  onDecrypt,
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
      console.log("Auto-locking password after 1 minute");
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

    const result = await onDecrypt(credentialId);
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
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">
          {revealed && secret ? secret : maskSecret("••••••••", 0)}
        </span>
        <div className="flex gap-1">
          <Button
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

