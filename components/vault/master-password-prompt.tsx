"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface MasterPasswordPromptProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onVerified: () => void;
}

export function MasterPasswordPrompt({
    open,
    onOpenChange,
    onVerified,
}: MasterPasswordPromptProps) {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleVerify = async (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (loading) return;
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/master-password/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (data.success) {
                setPassword("");
                onOpenChange(false);
                // Small delay to ensure dialog closes before decrypting
                setTimeout(() => {
                    onVerified();
                }, 100);
            } else {
                setError(data.error || "Invalid master password");
            }
        } catch (err) {
            setError("Failed to verify password");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            handleVerify();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Verify Master Password
                    </DialogTitle>
                    <DialogDescription>
                        Enter your master password to view this credential&apos;s secret.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Input
                            id="master-password"
                            type="password"
                            placeholder="Enter master password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            required
                            autoFocus
                            disabled={loading}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleVerify}
                            disabled={loading || !password}
                        >
                            {loading ? "Verifying..." : "Verify"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
