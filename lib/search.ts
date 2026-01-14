/**
 * Server-side search and filtering logic
 */

import { createClient } from "./supabase/server";
import type { SearchParams, SearchResults, CredentialWithTags } from "./types";

/**
 * Search credentials with filters
 */
export async function searchCredentials(
  userId: string,
  params: SearchParams
): Promise<SearchResults> {
  const supabase = await createClient();
  const page = params.page || 1;
  const limit = params.limit || 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("vault_credentials")
    .select(
      `
      *,
      vault_credential_tags(
        tag_id,
        vault_tags(*)
      )
    `,
      { count: "exact" }
    )
    .eq("user_id", userId)
    .is("deleted_at", null);

  // Text search (title, website_url)
  if (params.query) {
    const searchTerm = params.query.trim();
    query = query.or(
      `title.ilike.%${searchTerm}%,website_url.ilike.%${searchTerm}%`
    );
  }

  // Filter by type
  if (params.type) {
    query = query.eq("type", params.type);
  }

  // Filter by environment
  if (params.environment) {
    query = query.eq("environment", params.environment);
  }

  // Filter by auth provider
  if (params.auth_provider) {
    query = query.eq("auth_provider", params.auth_provider);
  }

  // Filter by favorite
  if (params.favorite !== undefined) {
    query = query.eq("favorite", params.favorite);
  }

  // Sorting
  switch (params.sort_by) {
    case "last_accessed":
      query = query.order("last_accessed_at", { ascending: false, nullsFirst: false });
      break;
    case "title":
      query = query.order("title", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  // Transform data to include tags
  const credentials: CredentialWithTags[] = (data || []).map((cred: any) => ({
    ...cred,
    tags: cred.vault_credential_tags?.map((ct: any) => ct.vault_tags) || [],
  }));

  return {
    credentials,
    total: count || 0,
    page,
    limit,
    has_more: (count || 0) > offset + limit,
  };
}

