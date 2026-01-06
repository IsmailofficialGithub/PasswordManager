import { CredentialForm } from "@/components/vault/credential-form";

export default function NewCredentialPage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">New Credential</h1>
      <CredentialForm />
    </div>
  );
}

