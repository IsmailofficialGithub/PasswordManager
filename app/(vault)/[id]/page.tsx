import { notFound } from "next/navigation";
import { getCredentialById, getRelatedEnvCredentials } from "@/app/(vault)/actions";
import { CredentialForm } from "@/components/vault/credential-form";
import { EnvForm } from "@/components/vault/env-form";

export default async function CredentialPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await getCredentialById(params.id);

  if (!result.success || !result.credential) {
    notFound();
  }

  const isEnv = result.credential.type === "env";
  
  let relatedCredentials: typeof result.credential[] = [];
  if (isEnv) {
    const relatedResult = await getRelatedEnvCredentials(result.credential);
    if (relatedResult.success && relatedResult.credentials) {
      relatedCredentials = relatedResult.credentials;
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">
        {isEnv ? "Edit Env File" : "Edit Credential"}
      </h1>
      {isEnv ? (
        <EnvForm credential={result.credential} relatedCredentials={relatedCredentials} />
      ) : (
        <CredentialForm credential={result.credential} />
      )}
    </div>
  );
}

