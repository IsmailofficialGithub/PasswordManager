"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toggleFavorite, decryptSecret } from "@/app/(vault)/actions";
import { PasswordReveal } from "@/components/vault/password-reveal";
import type { CredentialWithTags } from "@/lib/types";
import { Star, ExternalLink, Server, Globe, Key, Code, FileCode } from "lucide-react";

interface CredentialCardProps {
  credential: CredentialWithTags;
}

const typeIcons = {
  server: Server,
  website: Globe,
  oauth: Key,
  api: Code,
  custom: Key,
  env: FileCode,
};

export function CredentialCard({ credential }: CredentialCardProps) {
  const [favorite, setFavorite] = useState(credential.favorite);
  const [loading, setLoading] = useState(false);

  const Icon = typeIcons[credential.type] || Key;

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    const result = await toggleFavorite(credential.id);
    if (result.success) {
      setFavorite(result.favorite || false);
    }
    setLoading(false);
  };

  return (
    <Card className="transition-shadow hover:shadow-md overflow-hidden w-full max-w-full">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <Link href={`/${credential.id}`} className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <h3 className="font-semibold truncate">{credential.title}</h3>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleToggleFavorite}
          disabled={loading}
        >
          <Star
            className={`h-4 w-4 ${favorite ? "fill-yellow-400 text-yellow-400" : ""
              }`}
          />
        </Button>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="space-y-2 text-sm min-w-0">
          {credential.website_url && (
            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate">{credential.website_url}</span>
            </div>
          )}
          {credential.username && (
            <div className="text-muted-foreground truncate">
              <span className="font-medium">
                {credential.type === "env" ? "Folder:" : "User:"}
              </span>{" "}
              {credential.username}
            </div>
          )}
          {credential.encrypted_secret && (
            <div className="text-muted-foreground min-w-0" onClick={(e) => e.preventDefault()}>
              <div className="flex items-start gap-2 min-w-0">
                <span className="font-medium shrink-0">Secret:</span>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <PasswordReveal
                    encryptedSecret={credential.encrypted_secret}
                    credentialId={credential.id}
                    onDecrypt={decryptSecret}
                  />
                </div>
              </div>
            </div>
          )}
          {credential.environment && (
            <div>
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium">
                {credential.environment}
              </span>
            </div>
          )}
          {credential.tags && credential.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {credential.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

