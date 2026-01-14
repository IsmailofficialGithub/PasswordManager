"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CredentialType, Environment } from "@/lib/types";

interface FiltersProps {
  initialType?: CredentialType;
  initialEnvironment?: Environment;
  initialFavorite?: boolean;
}

export function Filters({
  initialType,
  initialEnvironment,
  initialFavorite,
}: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex gap-2">
      <select
        value={initialType || ""}
        onChange={(e) => updateFilter("type", e.target.value || null)}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">All Types</option>
        <option value="server">Server</option>
        <option value="website">Website</option>
        <option value="oauth">OAuth</option>
        <option value="api">API</option>
        <option value="custom">Custom</option>
      </select>

      <select
        value={initialEnvironment || ""}
        onChange={(e) => updateFilter("env", e.target.value || null)}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">All Environments</option>
        <option value="prod">Production</option>
        <option value="staging">Staging</option>
        <option value="dev">Development</option>
      </select>

      {initialFavorite && (
        <Button
          variant="outline"
          onClick={() => updateFilter("favorite", null)}
        >
          Clear Favorites
        </Button>
      )}
    </div>
  );
}

