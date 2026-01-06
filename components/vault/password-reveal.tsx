"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import { maskSecret } from "@/lib/security";

interface PasswordRevealProps {
  encryptedSecret: string;
  credentialId: string;
  onDecrypt: (credentialId: string) => Promise<{ success: boolean; secret?: string; error?: string }>;
}

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

  const handleReveal = async () => {
    if (secret) {
      setRevealed(!revealed);
      return;
    }

    setLoading(true);
    setError("");

    const result = await onDecrypt(credentialId);
    if (result.success && result.secret) {
      setSecret(result.secret);
      setRevealed(true);
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
    } catch (err) {
      setError("Failed to copy to clipboard");
    }
  };

  if (!encryptedSecret) {
    return <span className="text-muted-foreground">No secret stored</span>;
  }

  return (
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
  );
}

