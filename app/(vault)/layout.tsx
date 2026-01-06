import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/supabase/server";
import { isVaultUnlocked } from "@/lib/auth";
import { Sidebar } from "@/components/vault/sidebar";
import { AutoLockProvider } from "@/components/vault/auto-lock-provider";

export default async function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const unlocked = await isVaultUnlocked();
  if (!unlocked) {
    redirect("/master-password");
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <AutoLockProvider>{children}</AutoLockProvider>
      </main>
    </div>
  );
}

