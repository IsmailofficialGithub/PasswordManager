import { Suspense } from "react";
import { CredentialsList } from "@/components/vault/credentials-list";
import { SearchBar } from "@/components/vault/search-bar";
import { Filters } from "@/components/vault/filters";
import type { CredentialType, Environment } from "@/lib/types";

// Type guard to validate credential type
function isValidCredentialType(value: string | undefined): value is CredentialType {
  return value === "server" || value === "website" || value === "oauth" || value === "api" || value === "custom";
}

// Type guard to validate environment
function isValidEnvironment(value: string | undefined): value is Environment {
  return value === "prod" || value === "staging" || value === "dev";
}

export default async function VaultPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const query = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const typeParam = typeof searchParams.type === "string" ? searchParams.type : undefined;
  const type = isValidCredentialType(typeParam) ? typeParam : undefined;
  const envParam = typeof searchParams.env === "string" ? searchParams.env : undefined;
  const environment = isValidEnvironment(envParam) ? envParam : undefined;
  const favorite = searchParams.favorite === "true";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card p-6">
        <h1 className="mb-4 text-3xl font-bold">Credentials</h1>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <SearchBar initialQuery={query} />
          </div>
          <Filters
            initialType={type}
            initialEnvironment={environment}
            initialFavorite={favorite}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<CredentialsListSkeleton />}>
          <CredentialsList
            query={query}
            type={type}
            environment={environment}
            favorite={favorite}
          />
        </Suspense>
      </div>
    </div>
  );
}

function CredentialsListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-lg border bg-muted"
        />
      ))}
    </div>
  );
}

