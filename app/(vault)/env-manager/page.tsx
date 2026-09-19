import { Suspense } from "react";
import Link from "next/link";
import { CredentialsList } from "@/components/vault/credentials-list";
import { SearchBar } from "@/components/vault/search-bar";
import { Filters } from "@/components/vault/filters";
import { Button } from "@/components/ui/button";
import { Plus, FolderGit2, Sparkles } from "lucide-react";
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
      <div className="border-b border-border/60 bg-gradient-to-r from-card via-card to-muted/30 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FolderGit2 className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Env Manager</h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Securely store, organize, and manage encrypted environment files and configurations across projects.
            </p>
          </div>
          <Link href="/env-manager/new">
            <Button className="shadow-sm font-semibold hover:shadow-md transition-all gap-1.5 px-5">
              <Plus className="h-4 w-4" />
              <span>New Env Vault</span>
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
          className="h-36 animate-pulse rounded-xl border border-border/40 bg-muted/30"
        />
      ))}
    </div>
  );
}

