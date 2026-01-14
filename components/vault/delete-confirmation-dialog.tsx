"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    itemCount?: number;
    itemName?: string;
}

// Generate random confirmation words
const CONFIRMATION_WORDS = [
    "DELETE", "REMOVE", "CONFIRM", "ERASE", "DESTROY",
    "PURGE", "CLEAR", "WIPE", "OBLITERATE", "ELIMINATE"
];

function generateRandomWord(): string {
    return CONFIRMATION_WORDS[Math.floor(Math.random() * CONFIRMATION_WORDS.length)];
}

export function DeleteConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    itemCount = 1,
    itemName,
}: DeleteConfirmationDialogProps) {
    const [confirmationWord, setConfirmationWord] = useState("");
    const [userInput, setUserInput] = useState("");
    const [error, setError] = useState("");

    // Generate new random word when dialog opens
    useEffect(() => {
        if (open) {
            setConfirmationWord(generateRandomWord());
            setUserInput("");
            setError("");
        }
    }, [open]);

    const handleConfirm = () => {
        if (userInput.toUpperCase() === confirmationWord) {
            onConfirm();
            onOpenChange(false);
            setUserInput("");
            setError("");
        } else {
            setError(`Please type "${confirmationWord}" to confirm deletion`);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
        setUserInput("");
        setError("");
    };

    const isMultiple = itemCount > 1;
    const itemText = isMultiple
        ? `${itemCount} credentials`
        : itemName || "this credential";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Confirm Deletion
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. {isMultiple ? "These credentials" : "This credential"} will be moved to trash.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-md bg-destructive/10 p-4">
                        <p className="text-sm font-medium">
                            You are about to delete <span className="font-bold">{itemText}</span>
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Type <span className="font-mono font-bold text-destructive">{confirmationWord}</span> to confirm:
                        </label>
                        <Input
                            value={userInput}
                            onChange={(e) => {
                                setUserInput(e.target.value);
                                setError("");
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleConfirm();
                                }
                            }}
                            placeholder={`Type ${confirmationWord} here`}
                            autoFocus
                            className={error ? "border-destructive" : ""}
                        />
                        {error && (
                            <p className="text-xs text-destructive">{error}</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirm}
                    >
                        Delete {isMultiple ? `${itemCount} Items` : ""}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
