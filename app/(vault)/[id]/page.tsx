import { notFound } from "next/navigation";
import { getCredentialById } from "@/app/(vault)/actions";
import { CredentialForm } from "@/components/vault/credential-form";

export default async function CredentialPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await getCredentialById(params.id);

  if (!result.success || !result.credential) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Edit Credential</h1>
      <CredentialForm credential={result.credential} />
    </div>
  );
}

