import { EnvForm } from "@/components/vault/env-form";
import { FolderGit2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewEnvManagerPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 bg-gradient-to-r from-card via-card to-muted/30 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/env-manager">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FolderGit2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">New Project Vault</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Set up a new project environment vault with custom file tree and encrypted secrets.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <EnvForm />
      </div>
    </div>
  );
}

