"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CredentialCard } from "./credential-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog";
import { deleteCredential } from "@/app/(vault)/actions";
import { Trash2, X } from "lucide-react";
import type { CredentialWithTags } from "@/lib/types";

interface CredentialsGridProps {
    credentials: CredentialWithTags[];
}

export function CredentialsGrid({ credentials }: CredentialsGridProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectAll = () => {
        setSelectedIds(new Set(credentials.map(c => c.id)));
    };

    const deselectAll = () => {
        setSelectedIds(new Set());
    };

    const exitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        setShowDeleteDialog(true);
    };

    const confirmBulkDelete = async () => {
        startTransition(async () => {
            // Delete all selected credentials
            const deletePromises = Array.from(selectedIds).map(id =>
                deleteCredential(id)
            );

            await Promise.all(deletePromises);

            // Reset state and refresh
            setSelectedIds(new Set());
            setSelectionMode(false);
            router.refresh();
        });
    };

    if (selectionMode) {
        return (
            <>
                <div className="mb-4 flex items-center justify-between rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                            {selectedIds.size} selected
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={selectedIds.size === credentials.length ? deselectAll : selectAll}
                        >
                            {selectedIds.size === credentials.length ? "Deselect All" : "Select All"}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={selectedIds.size === 0 || isPending}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete {selectedIds.size > 0 && `(${selectedIds.size})`}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={exitSelectionMode}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {credentials.map((credential) => (
                        <div key={credential.id} className="relative">
                            <div
                                className={`absolute left-2 top-2 z-10 ${selectedIds.has(credential.id) ? "opacity-100" : "opacity-60 hover:opacity-100"
                                    }`}
                            >
                                <Checkbox
                                    checked={selectedIds.has(credential.id)}
                                    onCheckedChange={() => toggleSelection(credential.id)}
                                    className="h-5 w-5 border-2 bg-background"
                                />
                            </div>
                            <div className={selectedIds.has(credential.id) ? "ring-2 ring-primary rounded-lg" : ""}>
                                <CredentialCard credential={credential} />
                            </div>
                        </div>
                    ))}
                </div>

                <DeleteConfirmationDialog
                    open={showDeleteDialog}
                    onOpenChange={setShowDeleteDialog}
                    onConfirm={confirmBulkDelete}
                    itemCount={selectedIds.size}
                />
            </>
        );
    }

    return (
        <>
            <div className="mb-4 flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectionMode(true)}
                >
                    Select Multiple
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {credentials.map((credential) => (
                    <CredentialCard key={credential.id} credential={credential} />
                ))}
            </div>
        </>
    );
}
