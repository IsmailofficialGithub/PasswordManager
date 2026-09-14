import { Suspense } from "react";
import Link from "next/link";
import { CredentialsList } from "@/components/vault/credentials-list";
import { SearchBar } from "@/components/vault/search-bar";
import { Filters } from "@/components/vault/filters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Environment } from "@/lib/types";

function isValidEnvironment(value: string | undefined): value is Environment {
  return value === "prod" || value === "staging" || value === "dev";
}

export default async function EnvManagerPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const query = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const envParam = typeof searchParams.env === "string" ? searchParams.env : undefined;
  const environment = isValidEnvironment(envParam) ? envParam : undefined;
  const favorite = searchParams.favorite === "true";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Env Manager</h1>
          <Link href="/env-manager/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Env File
            </Button>
          </Link>
        </div>
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <SearchBar initialQuery={query} />
          </div>
          <Filters
            initialEnvironment={environment}
            initialFavorite={favorite}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Suspense fallback={<CredentialsListSkeleton />}>
          <CredentialsList
            query={query}
            type="env"
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
