"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Folder, FileCode, Tags } from "lucide-react";
import type { CredentialWithTags } from "@/lib/types";

interface EnvProjectCardProps {
  title: string;
  credentials: CredentialWithTags[];
}

export function EnvProjectCard({ title, credentials }: EnvProjectCardProps) {
  // Extract unique folders and environments
  const folders = new Set(credentials.map((c) => c.username || "/"));
  const environments = new Set(credentials.map((c) => c.environment || "prod"));
  const tags = new Set(credentials.flatMap((c) => c.tags?.map(t => t.name) || []));
  
  // Use the first credential's ID to navigate (the form will fetch the rest using the title anyway)
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
            <div className="flex items-center gap-2 text-muted-foreground">
              <Folder className="h-4 w-4" />
              <span>{folders.size} Folder{folders.size !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {Array.from(environments).map((env) => (
                <span
                  key={env}
                  className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium"
                >
                  {env}
                </span>
              ))}
            </div>

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
