import { Suspense } from "react";
import { CredentialsList } from "@/components/vault/credentials-list";
import { SearchBar } from "@/components/vault/search-bar";
import { Filters } from "@/components/vault/filters";

export default async function VaultPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const query = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const type = typeof searchParams.type === "string" ? searchParams.type : undefined;
  const environment = typeof searchParams.env === "string" ? searchParams.env : undefined;
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
            type={type as any}
            environment={environment as any}
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

