"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SearchBarProps {
  initialQuery?: string;
}

export function SearchBar({ initialQuery }: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery || "");

  useEffect(() => {
    setQuery(initialQuery || "");
  }, [initialQuery]);

  const executeSearch = (targetQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (targetQuery.trim()) {
      params.set("q", targetQuery.trim());
    } else {
      params.delete("q");
    }
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newUrl);
  };

  useEffect(() => {
    const currentQ = searchParams.get("q") || "";
    if (query === currentQ) return;

    const timer = setTimeout(() => {
      executeSearch(query);
    }, 300); // Debounce 300ms

    return () => clearTimeout(timer);
  }, [query]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  return (
    <form onSubmit={handleFormSubmit} className="relative flex items-center w-full">
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="absolute left-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        title="Search"
      >
        <Search className="h-4 w-4" />
      </Button>
      <Input
        type="search"
        placeholder="Search credentials..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10"
      />
    </form>
  );
}
