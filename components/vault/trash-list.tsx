"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CredentialCard } from "@/components/vault/credential-card";
import { restoreCredential, permanentlyDeleteCredential } from "@/app/(vault)/actions";
import type { CredentialWithTags } from "@/lib/types";

interface TrashListProps {
    credentials: CredentialWithTags[];
}

export function TrashList({ credentials }: TrashListProps) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    const handleRestore = async (id: string) => {
        setLoading(id);
        const result = await restoreCredential(id);
        setLoading(null);

        if (result.success) {
            router.refresh();
        } else {
            alert(result.error || "Failed to restore credential");
        }
    };

    const handlePermanentDelete = async (id: string) => {
        if (!confirm("Are you sure you want to permanently delete this credential? This action cannot be undone.")) {
            return;
        }

        setLoading(id);
        const result = await permanentlyDeleteCredential(id);
        setLoading(null);

        if (result.success) {
            router.refresh();
        } else {
            alert(result.error || "Failed to delete credential");
        }
    };

    if (credentials.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                <p>No deleted credentials</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {credentials.map((credential) => (
                <div key={credential.id} className="relative">
                    <CredentialCard credential={credential} />
                    <div className="mt-2 flex gap-2">
                        <button
                            onClick={() => handleRestore(credential.id)}
                            disabled={loading === credential.id}
                            className="text-sm text-primary hover:underline disabled:opacity-50"
                        >
                            {loading === credential.id ? "Restoring..." : "Restore"}
                        </button>
                        <button
                            onClick={() => handlePermanentDelete(credential.id)}
                            disabled={loading === credential.id}
                            className="text-sm text-destructive hover:underline disabled:opacity-50"
                        >
                            {loading === credential.id ? "Deleting..." : "Delete Permanently"}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
