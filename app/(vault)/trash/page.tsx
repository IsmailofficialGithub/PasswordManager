import { Suspense } from "react";
import { createClient, getServerUser } from "@/lib/supabase/server";
import { TrashList } from "@/components/vault/trash-list";

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
      <TrashList credentials={credentialsWithTags} />
    </div>
  );
}

