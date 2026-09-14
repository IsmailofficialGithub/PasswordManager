"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCredential, updateCredential, deleteCredential, decryptSecret } from "@/app/(vault)/actions";
import { PasswordReveal } from "@/components/vault/password-reveal";
import { DeleteConfirmationDialog } from "@/components/vault/delete-confirmation-dialog";

import type { CredentialWithTags, CredentialFormData } from "@/lib/types";

interface EnvFormProps {
  credential?: CredentialWithTags;
}

export function EnvForm({ credential }: EnvFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [formData, setFormData] = useState<CredentialFormData>({
    title: credential?.title || "",
    type: "env",
    website_url: credential?.website_url || "",
    username: credential?.username || "",
    secret: "", // Never pre-fill secret
    environment: credential?.environment || "dev",
    notes: credential?.notes || "",
    favorite: credential?.favorite || false,
    tag_ids: credential?.tags?.map((t) => t.id) || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.website_url) {
      setError("GitHub Repo URL is required");
      return;
    }

    startTransition(async () => {
      setError("");
      setSuccess(false);

      const result = credential
        ? await updateCredential(credential.id, formData)
        : await createCredential(formData);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/env-manager");
          router.refresh();
        }, 1000);
      } else {
        setError(result.error || "Failed to save env file");
      }
    });
  };

  const handleDelete = async () => {
    if (!credential) return;
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!credential) return;

    startTransition(async () => {
      const result = await deleteCredential(credential.id);
      if (result.success) {
        router.push("/env-manager");
        router.refresh();
      } else {
        setError(result.error || "Failed to delete env file");
      }
    });
  };

  return (
    <>
      {credential && (
        <Card className="max-w-2xl mb-6">
          <CardHeader>
            <CardTitle>Current Env File</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {credential.encrypted_secret && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  .env Content
                </label>
                <PasswordReveal
                  encryptedSecret={credential.encrypted_secret}
                  credentialId={credential.id}
                  onDecrypt={decryptSecret}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {credential ? "Edit Env File" : "Create Env File"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {success && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                {credential ? "Env file updated successfully!" : "Env file created successfully!"}
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title / Repo Name *
              </label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="website_url" className="text-sm font-medium">
                GitHub Repo URL *
              </label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) =>
                  setFormData({ ...formData, website_url: e.target.value })
                }
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="environment" className="text-sm font-medium">
                Environment Stage *
              </label>
              <select
                id="environment"
                value={formData.environment || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    environment: (e.target.value || undefined) as any,
                  })
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                disabled={isPending}
              >
                <option value="prod">Production</option>
                <option value="staging">Staging</option>
                <option value="dev">Development</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="secret" className="text-sm font-medium">
                .env Content *
              </label>
              <textarea
                id="secret"
                value={formData.secret}
                onChange={(e) =>
                  setFormData({ ...formData, secret: e.target.value })
                }
                required={!credential} // Only required when creating
                rows={10}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                disabled={isPending}
                placeholder="DATABASE_URL=...&#10;API_KEY=..."
              />
              <p className="text-xs text-muted-foreground">
                {credential
                  ? "Leave blank to keep current content, or enter new content to update"
                  : "Paste your .env file content here. It will be encrypted before storage."}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="favorite"
                checked={formData.favorite}
                onChange={(e) =>
                  setFormData({ ...formData, favorite: e.target.checked })
                }
                disabled={isPending}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="favorite" className="text-sm font-medium">
                Mark as favorite
              </label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : credential ? "Update" : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
              >
                Cancel
              </Button>
              {credential && (
                <Button
                  type="button"
                  variant="destructive"
                  className="ml-auto"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  Delete
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {credential && (
        <DeleteConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={confirmDelete}
          itemName={credential.title}
        />
      )}
    </>
  );
}
