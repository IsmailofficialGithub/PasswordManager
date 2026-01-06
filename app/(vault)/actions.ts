"use server";

/**
 * Server Actions for credential management
 * All encryption/decryption happens server-side
 */

import { requireAuthAndUnlock } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/encryption";
import { getClientIp, getUserAgent } from "@/lib/security";
import { rateLimitDecryption, rateLimitCredentialCreation } from "@/lib/rate-limit";
import { searchCredentials } from "@/lib/search";
import type {
  Credential,
  CredentialFormData,
  CredentialWithTags,
  SearchParams,
  SearchResults,
} from "@/lib/types";

/**
 * Create a new credential
 */
export async function createCredential(
  data: CredentialFormData
): Promise<{ success: boolean; credential?: Credential; error?: string }> {
  try {
    const { user, error: authError } = await requireAuthAndUnlock();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    // Rate limiting
    if (!rateLimitCredentialCreation(user.id)) {
      return { success: false, error: "Rate limit exceeded" };
    }

    const supabase = await createClient();

    // Encrypt secret if provided
    let encryptedSecret: string | null = null;
    if (data.secret) {
      encryptedSecret = encrypt(data.secret);
    }

    // Insert credential
    const { data: credential, error } = await supabase
      .from("vault_credentials")
      .insert({
        user_id: user.id,
        title: data.title,
        type: data.type,
        website_url: data.website_url || null,
        username: data.username || null,
        encrypted_secret: encryptedSecret,
        auth_provider: data.auth_provider || null,
        host: data.host || null,
        port: data.port || null,
        environment: data.environment || null,
        notes: data.notes || null,
        favorite: data.favorite || false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Add tags if provided
    if (data.tag_ids && data.tag_ids.length > 0) {
      const tagInserts = data.tag_ids.map((tagId) => ({
        credential_id: credential.id,
        tag_id: tagId,
      }));

      await supabase.from("vault_credential_tags").insert(tagInserts);
    }

    // Log audit
    const ip = await getClientIp();
    const userAgent = await getUserAgent();
    await supabase.from("vault_audit_logs").insert({
      user_id: user.id,
      credential_id: credential.id,
      action: "create",
      ip_address: ip,
      user_agent: userAgent,
    });

    return { success: true, credential };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update an existing credential
 */
export async function updateCredential(
  id: string,
  data: CredentialFormData
): Promise<{ success: boolean; credential?: Credential; error?: string }> {
  try {
    const { user, error: authError } = await requireAuthAndUnlock();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    const supabase = await createClient();

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from("vault_credentials")
      .select("encrypted_secret")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Credential not found" };
    }

    // Encrypt secret if provided and changed
    let encryptedSecret = existing.encrypted_secret;
    if (data.secret !== undefined) {
      if (data.secret) {
        encryptedSecret = encrypt(data.secret);
      } else {
        encryptedSecret = null;
      }
    }

    // Update credential
    const { data: credential, error } = await supabase
      .from("vault_credentials")
      .update({
        title: data.title,
        type: data.type,
        website_url: data.website_url || null,
        username: data.username || null,
        encrypted_secret: encryptedSecret,
        auth_provider: data.auth_provider || null,
        host: data.host || null,
        port: data.port || null,
        environment: data.environment || null,
        notes: data.notes || null,
        favorite: data.favorite || false,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Update tags
    if (data.tag_ids !== undefined) {
      // Delete existing tags
      await supabase
        .from("vault_credential_tags")
        .delete()
        .eq("credential_id", id);

      // Insert new tags
      if (data.tag_ids.length > 0) {
        const tagInserts = data.tag_ids.map((tagId) => ({
          credential_id: id,
          tag_id: tagId,
        }));

        await supabase.from("vault_credential_tags").insert(tagInserts);
      }
    }

    // Log audit
    const ip = await getClientIp();
    const userAgent = await getUserAgent();
    await supabase.from("vault_audit_logs").insert({
      user_id: user.id,
      credential_id: id,
      action: "update",
      ip_address: ip,
      user_agent: userAgent,
    });

    return { success: true, credential };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Soft delete a credential
 */
export async function deleteCredential(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, error: authError } = await requireAuthAndUnlock();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("vault_credentials")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit
    const ip = await getClientIp();
    const userAgent = await getUserAgent();
    await supabase.from("vault_audit_logs").insert({
      user_id: user.id,
      credential_id: id,
      action: "delete",
      ip_address: ip,
      user_agent: userAgent,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Restore a soft-deleted credential
 */
export async function restoreCredential(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, error: authError } = await requireAuthAndUnlock();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("vault_credentials")
      .update({ deleted_at: null })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit
    const ip = await getClientIp();
    const userAgent = await getUserAgent();
    await supabase.from("vault_audit_logs").insert({
      user_id: user.id,
      credential_id: id,
      action: "restore",
      ip_address: ip,
      user_agent: userAgent,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Permanently delete a credential
 */
export async function permanentlyDeleteCredential(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, error: authError } = await requireAuthAndUnlock();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    const supabase = await createClient();

    // Hard delete (cascade will handle related records)
    const { error } = await supabase
      .from("vault_credentials")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get a single credential by ID (encrypted)
 */
export async function getCredentialById(
  id: string
): Promise<{ success: boolean; credential?: CredentialWithTags; error?: string }> {
  try {
    const { user, error: authError } = await requireAuthAndUnlock();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("vault_credentials")
      .select(
        `
        *,
        vault_credential_tags(
          tag_id,
          vault_tags(*)
        )
      `
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      return { success: false, error: "Credential not found" };
    }

    // Update last accessed
    await supabase
      .from("vault_credentials")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", id);

    // Log audit
    const ip = await getClientIp();
    const userAgent = await getUserAgent();
    await supabase.from("vault_audit_logs").insert({
      user_id: user.id,
      credential_id: id,
      action: "view",
      ip_address: ip,
      user_agent: userAgent,
    });

    // Transform tags
    const credential: CredentialWithTags = {
      ...data,
      tags: (data as any).vault_credential_tags?.map((ct: any) => ct.vault_tags) || [],
    };

    return { success: true, credential };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Decrypt and return secret (one-time operation)
 */
export async function decryptSecret(
  credentialId: string
): Promise<{ success: boolean; secret?: string; error?: string }> {
  try {
    const { user, error: authError } = await requireAuthAndUnlock();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    // Rate limiting
    if (!rateLimitDecryption(user.id)) {
      return { success: false, error: "Rate limit exceeded" };
    }

    const supabase = await createClient();

    // Get encrypted secret
    const { data, error } = await supabase
      .from("vault_credentials")
      .select("encrypted_secret")
      .eq("id", credentialId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (error || !data || !data.encrypted_secret) {
      return { success: false, error: "Credential not found or has no secret" };
    }

    // Decrypt
    const secret = decrypt(data.encrypted_secret);

    // Log audit
    const ip = await getClientIp();
    const userAgent = await getUserAgent();
    await supabase.from("vault_audit_logs").insert({
      user_id: user.id,
      credential_id: credentialId,
      action: "copy",
      ip_address: ip,
      user_agent: userAgent,
    });

    return { success: true, secret };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Decryption failed",
    };
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(
  id: string
): Promise<{ success: boolean; favorite?: boolean; error?: string }> {
  try {
    const { user, error: authError } = await requireAuthAndUnlock();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    const supabase = await createClient();

    // Get current favorite status
    const { data: current, error: fetchError } = await supabase
      .from("vault_credentials")
      .select("favorite")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: "Credential not found" };
    }

    const newFavorite = !current.favorite;

    const { error } = await supabase
      .from("vault_credentials")
      .update({ favorite: newFavorite })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, favorite: newFavorite };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Search credentials with filters
 */
export async function searchCredentialsAction(
  params: SearchParams
): Promise<{ success: boolean; results?: SearchResults; error?: string }> {
  try {
    const { user, error: authError } = await requireAuthAndUnlock();
    if (authError || !user) {
      return { success: false, error: authError || "Not authenticated" };
    }

    const results = await searchCredentials(user.id, params);
    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
    };
  }
}

