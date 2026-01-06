"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCredential, updateCredential } from "@/app/(vault)/actions";
import type { CredentialWithTags, CredentialFormData } from "@/lib/types";

interface CredentialFormProps {
  credential?: CredentialWithTags;
}

export function CredentialForm({ credential }: CredentialFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<CredentialFormData>({
    title: credential?.title || "",
    type: credential?.type || "custom",
    website_url: credential?.website_url || "",
    username: credential?.username || "",
    secret: "", // Never pre-fill secret
    auth_provider: credential?.auth_provider || undefined,
    host: credential?.host || "",
    port: credential?.port || undefined,
    environment: credential?.environment || undefined,
    notes: credential?.notes || "",
    favorite: credential?.favorite || false,
    tag_ids: credential?.tags?.map((t) => t.id) || [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = credential
        ? await updateCredential(credential.id, formData)
        : await createCredential(formData);

      if (result.success) {
        router.push("/vault");
        router.refresh();
      } else {
        setError(result.error || "Failed to save credential");
      }
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>
          {credential ? "Edit Credential" : "Create Credential"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title *
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
                Type *
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as any,
                  })
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
                disabled={isPending}
              >
                <option value="server">Server</option>
                <option value="website">Website</option>
                <option value="oauth">OAuth</option>
                <option value="api">API</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="environment" className="text-sm font-medium">
                Environment
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
                disabled={isPending}
              >
                <option value="">None</option>
                <option value="prod">Production</option>
                <option value="staging">Staging</option>
                <option value="dev">Development</option>
              </select>
            </div>
          </div>

          {formData.type === "website" && (
            <div className="space-y-2">
              <label htmlFor="website_url" className="text-sm font-medium">
                Website URL
              </label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) =>
                  setFormData({ ...formData, website_url: e.target.value })
                }
                disabled={isPending}
              />
            </div>
          )}

          {(formData.type === "server" || formData.type === "api") && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="host" className="text-sm font-medium">
                    Host / IP
                  </label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) =>
                      setFormData({ ...formData, host: e.target.value })
                    }
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="port" className="text-sm font-medium">
                    Port
                  </label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        port: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    disabled={isPending}
                  />
                </div>
              </div>
            </>
          )}

          {formData.type === "oauth" && (
            <div className="space-y-2">
              <label htmlFor="auth_provider" className="text-sm font-medium">
                Auth Provider
              </label>
              <select
                id="auth_provider"
                value={formData.auth_provider || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    auth_provider: (e.target.value || undefined) as any,
                  })
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isPending}
              >
                <option value="">None</option>
                <option value="google">Google</option>
                <option value="auth0">Auth0</option>
                <option value="github">GitHub</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="secret" className="text-sm font-medium">
              Secret / Password
            </label>
            <Input
              id="secret"
              type="password"
              value={formData.secret}
              onChange={(e) =>
                setFormData({ ...formData, secret: e.target.value })
              }
              placeholder={credential ? "Leave blank to keep current" : ""}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              {credential
                ? "Leave blank to keep current secret, or enter new secret to update"
                : "Optional - can be added later"}
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
              rows={4}
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

