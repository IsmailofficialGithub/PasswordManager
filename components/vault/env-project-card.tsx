"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Folder, FileCode, Tags, FileText } from "lucide-react";
import type { CredentialWithTags, Environment } from "@/lib/types";

interface EnvProjectCardProps {
  title: string;
  credentials: CredentialWithTags[];
}

export function EnvProjectCard({ title, credentials }: EnvProjectCardProps) {
  // Extract unique folders and total files
  const folderPaths = new Set(
    credentials.map((c) => {
      const username = c.username || "/";
      const lastSlash = username.lastIndexOf("/");
      return lastSlash <= 0 ? "/" : username.substring(0, lastSlash);
    })
  );

  const environments = new Set(
    credentials
      .map((c) => c.environment)
      .filter((env): env is Environment => Boolean(env))
  );

  const tags = new Set(credentials.flatMap((c) => c.tags?.map((t) => t.name) || []));
  
  // Use the first credential ID for navigation
  const firstId = credentials[0]?.id;

  return (
    <Card className="transition-shadow hover:shadow-md cursor-pointer group">
      <Link href={`/${firstId}`} className="block h-full">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2 flex-1">
            <FileCode className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-blue-500/80" />
                <span>{folderPaths.size} Folder{folderPaths.size !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-emerald-500/80" />
                <span>{credentials.length} File{credentials.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            
            {environments.size > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Array.from(environments).map((env) => (
                  <span
                    key={env}
                    className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium"
                  >
                    {env}
                  </span>
                ))}
              </div>
            )}

            {tags.size > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <Tags className="h-3 w-3 mr-1 text-muted-foreground self-center" />
                {Array.from(tags).map((tagName) => (
                  <span
                    key={tagName}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px]"
                  >
                    {tagName}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

