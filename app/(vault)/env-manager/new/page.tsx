import { EnvForm } from "@/components/vault/env-form";

export default function NewEnvManagerPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card p-6">
        <h1 className="text-3xl font-bold">New Env File</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <EnvForm />
      </div>
    </div>
  );
}
