"use client";

import { EnvProjectCard } from "./env-project-card";
import type { CredentialWithTags } from "@/lib/types";

interface EnvProjectsGridProps {
  groupedCredentials: Map<string, CredentialWithTags[]>;
}

export function EnvProjectsGrid({ groupedCredentials }: EnvProjectsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from(groupedCredentials.entries()).map(([title, credentials]) => (
        <EnvProjectCard key={title} title={title} credentials={credentials} />
      ))}
    </div>
  );
}
