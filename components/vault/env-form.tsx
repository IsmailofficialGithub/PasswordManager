"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCredential, updateCredential, deleteCredential, decryptSecret } from "@/app/(vault)/actions";
import { PasswordReveal } from "@/components/vault/password-reveal";
import { DeleteConfirmationDialog } from "@/components/vault/delete-confirmation-dialog";

import type { CredentialWithTags, CredentialFormData, Environment } from "@/lib/types";

interface EnvFormProps {
  credential?: CredentialWithTags;
  relatedCredentials?: CredentialWithTags[];
}

export function EnvForm({ credential, relatedCredentials = [] }: EnvFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Combine all known credentials for this edit session
  const allCredentials = credential ? new Map<Environment, CredentialWithTags>([
    [credential.environment as Environment, credential],
    ...relatedCredentials
      .filter(c => c.environment)
      .map(c => [c.environment as Environment, c] as [Environment, CredentialWithTags])
  ]) : new Map<Environment, CredentialWithTags>();

  // State for multi-environment
  const isEditing = !!credential;
  const [activeTab, setActiveTab] = useState<Environment>(credential?.environment || "prod");
  const [envContents, setEnvContents] = useState<Record<string, string>>({
    prod: "",
    staging: "",
    dev: "",
  });

  const activeCredential = allCredentials.get(activeTab);

  // Common metadata for the repository
  const [formData, setFormData] = useState<CredentialFormData>({
    title: credential?.title || "",
    type: "env",
    website_url: credential?.website_url || "",
    username: credential?.username || "",
    secret: "", // Never pre-fill secret
    environment: credential?.environment || "prod",
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

      const submitData = { ...formData };
      if (!submitData.username || submitData.username.trim() === "") {
        submitData.username = "/";
      }

      if (isEditing) {
        // Edit mode: update all existing related credentials with common metadata
        const promises = [];
        
        // Ensure the current active credentials are updated with new metadata
        for (const [env, existingCred] of Array.from(allCredentials.entries())) {
          const secretContent = envContents[env as Environment];
          promises.push(
            updateCredential(existingCred.id, {
              ...submitData,
              environment: env as Environment,
              secret: secretContent ? secretContent : undefined, // only update secret if provided
            })
          );
        }
        
        // If the user filled out envContents for an environment that didn't exist yet, create it
        for (const [env, content] of Object.entries(envContents)) {
          if (content.trim() !== "" && !allCredentials.has(env as Environment)) {
            promises.push(
              createCredential({
                ...submitData,
                environment: env as Environment,
                secret: content,
              })
            );
          }
        }
        
        const results = await Promise.all(promises);
        const failed = results.find(r => !r.success);
        if (failed) {
          setError(failed.error || "Failed to update some env files");
        } else {
          setSuccess(true);
          setTimeout(() => {
            router.push("/env-manager");
            router.refresh();
          }, 1000);
        }
      } else {
        // Create mode: save all non-empty environments
        const environmentsToSave = Object.entries(envContents).filter(([_, content]) => content.trim() !== "");
        
        if (environmentsToSave.length === 0) {
          setError("Please provide .env content for at least one environment stage.");
          return;
        }

        const promises = environmentsToSave.map(([env, content]) => {
          return createCredential({
            ...submitData,
            environment: env as Environment,
            secret: content,
          });
        });

        const results = await Promise.all(promises);
        
        const failed = results.find(r => !r.success);
        if (failed) {
          setError(failed.error || "Failed to save some env files");
        } else {
          setSuccess(true);
          setTimeout(() => {
            router.push("/env-manager");
            router.refresh();
          }, 1000);
        }
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
      {activeCredential && (
        <Card className="max-w-2xl mb-6">
          <CardHeader>
            <CardTitle>Current Env File ({activeTab})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeCredential.encrypted_secret ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  .env Content
                </label>
                <PasswordReveal
                  key={activeCredential.id}
                  encryptedSecret={activeCredential.encrypted_secret}
                  credentialId={activeCredential.id}
                  onDecrypt={decryptSecret}
                  isMultiline={true}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No secret stored for this environment.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {credential ? "Edit Env File" : "Create Env Files"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {success && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
                {credential ? "Env file updated successfully!" : "Env files created successfully!"}
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
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

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="username" className="text-sm font-medium">
                  Folder / Service Name
                </label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="e.g., /, /backend, /frontend (defaults to /)"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Removed Single Environment selection for Editing, using tabs instead */}

            <div className="space-y-2">
              <label htmlFor="secret" className="text-sm font-medium">
                .env Content
              </label>

              {/* Multi-Tab for Environments */}
              <div className="flex gap-2 mb-2 bg-muted p-1 rounded-md">
                <Button
                  type="button"
                  variant={activeTab === "prod" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setActiveTab("prod")}
                >
                  Production
                  {allCredentials.has("prod") && <span className="ml-2 w-2 h-2 rounded-full bg-blue-500" title="Exists"></span>}
                  {envContents.prod && <span className="ml-2 w-2 h-2 rounded-full bg-green-500" title="Has pending changes"></span>}
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "staging" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setActiveTab("staging")}
                >
                  Staging
                  {allCredentials.has("staging") && <span className="ml-2 w-2 h-2 rounded-full bg-blue-500" title="Exists"></span>}
                  {envContents.staging && <span className="ml-2 w-2 h-2 rounded-full bg-green-500" title="Has pending changes"></span>}
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "dev" ? "default" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setActiveTab("dev")}
                >
                  Development
                  {allCredentials.has("dev") && <span className="ml-2 w-2 h-2 rounded-full bg-blue-500" title="Exists"></span>}
                  {envContents.dev && <span className="ml-2 w-2 h-2 rounded-full bg-green-500" title="Has pending changes"></span>}
                </Button>
              </div>

              <textarea
                id={`secret-${activeTab}`}
                value={envContents[activeTab]}
                onChange={(e) =>
                  setEnvContents({ ...envContents, [activeTab]: e.target.value })
                }
                rows={10}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                disabled={isPending}
                placeholder={activeCredential ? `Leave blank to keep current ${activeTab} content, or paste new content to overwrite.` : `Paste ${activeTab} .env content here...`}
              />

              <p className="text-xs text-muted-foreground">
                {isEditing
                  ? "Changes to Title or Repo URL will apply to all related environment records."
                  : "Switch between tabs to paste content for different environments. Non-empty tabs will be saved as separate records."}
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

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : credential ? "Update" : "Save All"}
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
