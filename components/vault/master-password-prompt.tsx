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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Master password verify button clicked");
        setLoading(true);
        setError("");

        try {
            console.log("Sending verification request...");
            const response = await fetch("/api/master-password/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();
            console.log("Verification response:", data);

            if (data.success) {
                console.log("Verification successful, calling onVerified");
                setPassword("");
                onOpenChange(false);
                // Small delay to ensure dialog closes before decrypting
                setTimeout(() => {
                    onVerified();
                }, 100);
            } else {
                console.log("Verification failed:", data.error);
                setError(data.error || "Invalid master password");
            }
        } catch (err) {
            console.error("Verification error:", err);
            setError("Failed to verify password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Verify Master Password
                    </DialogTitle>
                    <DialogDescription>
                        Enter your master password to view this credential's secret.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? "Verifying..." : "Verify"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
