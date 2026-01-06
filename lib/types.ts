/**
 * Type definitions for the Vault application
 */

export type CredentialType = "server" | "website" | "oauth" | "api" | "custom";
export type AuthProvider = "google" | "auth0" | "github" | "custom";
export type Environment = "prod" | "staging" | "dev";
export type AuditAction = "view" | "copy" | "create" | "update" | "delete" | "restore";

/**
 * Credential record from database (encrypted)
 */
export interface Credential {
  id: string;
  user_id: string;
  title: string;
  type: CredentialType;
  website_url?: string | null;
  username?: string | null;
  encrypted_secret?: string | null;
  auth_provider?: AuthProvider | null;
  host?: string | null;
  port?: number | null;
  environment?: Environment | null;
  notes?: string | null;
  favorite: boolean;
  last_accessed_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Credential with decrypted secret (server-side only, never sent to client)
 */
export interface CredentialWithSecret extends Credential {
  secret?: string; // Decrypted, only available server-side
}

/**
 * Credential form data (for create/update)
 */
export interface CredentialFormData {
  title: string;
  type: CredentialType;
  website_url?: string;
  username?: string;
  secret?: string; // Plaintext, will be encrypted before storage
  auth_provider?: AuthProvider;
  host?: string;
  port?: number;
  environment?: Environment;
  notes?: string;
  favorite?: boolean;
  tag_ids?: string[];
}

/**
 * Tag record
 */
export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Credential with tags (for display)
 */
export interface CredentialWithTags extends Credential {
  tags?: Tag[];
}

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  user_id: string;
  credential_id?: string | null;
  action: AuditAction;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

/**
 * User profile with master password info
 */
export interface VaultUser {
  id: string;
  user_id: string;
  master_password_hash: string;
  master_password_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Search and filter parameters
 */
export interface SearchParams {
  query?: string;
  type?: CredentialType;
  environment?: Environment;
  auth_provider?: AuthProvider;
  favorite?: boolean;
  tag_ids?: string[];
  sort_by?: "newest" | "last_accessed" | "title";
  page?: number;
  limit?: number;
}

/**
 * Search results
 */
export interface SearchResults {
  credentials: CredentialWithTags[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

