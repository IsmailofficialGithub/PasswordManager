import { Suspense } from "react";
import { createClient, getServerUser } from "@/lib/supabase/server";
import { CredentialCard } from "@/components/vault/credential-card";
import { restoreCredential, permanentlyDeleteCredential } from "@/app/(vault)/actions";

export default async function TrashPage() {
  const user = await getServerUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: credentials } = await supabase
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
    .eq("user_id", user.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const credentialsWithTags = (credentials || []).map((cred: any) => ({
    ...cred,
    tags: cred.vault_credential_tags?.map((ct: any) => ct.vault_tags) || [],
  }));

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Trash</h1>
      {credentialsWithTags.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <p>No deleted credentials</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {credentialsWithTags.map((credential) => (
            <div key={credential.id} className="relative">
              <CredentialCard credential={credential} />
              <div className="mt-2 flex gap-2">
                <form action={restoreCredential.bind(null, credential.id)}>
                  <button
                    type="submit"
                    className="text-sm text-primary hover:underline"
                  >
                    Restore
                  </button>
                </form>
                <form action={permanentlyDeleteCredential.bind(null, credential.id)}>
                  <button
                    type="submit"
                    className="text-sm text-destructive hover:underline"
                  >
                    Delete Permanently
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

