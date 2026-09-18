import { notFound } from "next/navigation";
import { getCredentialById, getProjectEnvCredentials } from "@/app/(vault)/actions";
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
  
  if (isEnv) {
    const projectResult = await getProjectEnvCredentials(result.credential.title);
    if (!projectResult.success || !projectResult.credentials) {
      notFound();
    }
    return (
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Edit Project Envs</h1>
        <EnvForm projectCredentials={projectResult.credentials} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">Edit Credential</h1>
      <CredentialForm credential={result.credential} />
    </div>
  );
}
