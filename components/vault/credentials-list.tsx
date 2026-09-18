import { searchCredentialsAction } from "@/app/(vault)/actions";
import { CredentialsGrid } from "./credentials-grid";
import { EnvProjectsGrid } from "./env-projects-grid";
import type { CredentialType, Environment, CredentialWithTags } from "@/lib/types";

interface CredentialsListProps {
  query?: string;
  type?: CredentialType;
  environment?: Environment;
  favorite?: boolean;
}

export async function CredentialsList({
  query,
  type,
  environment,
  favorite,
}: CredentialsListProps) {
  const result = await searchCredentialsAction({
    query,
    type,
    environment,
    favorite,
    sort_by: "newest",
    limit: 100,
  });

  if (!result.success || !result.results) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        {result.error || "Failed to load credentials"}
      </div>
    );
  }

  const { credentials } = result.results;

  if (credentials.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
        <p className="text-lg font-medium">No credentials found</p>
        <p className="text-sm">Create your first credential to get started</p>
      </div>
    );
  }

  if (type === "env") {
    const grouped = new Map<string, CredentialWithTags[]>();
    for (const c of credentials) {
      const title = c.title || "Unnamed Project";
      if (!grouped.has(title)) {
        grouped.set(title, []);
      }
      grouped.get(title)!.push(c);
    }
    return <EnvProjectsGrid groupedCredentials={grouped} />;
  }

  return <CredentialsGrid credentials={credentials} />;
}

