import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/supabase/server";
import { isVaultUnlocked } from "@/lib/auth";
import { Sidebar } from "@/components/vault/sidebar";
import { AutoLockProvider } from "@/components/vault/auto-lock-provider";

export default async function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check custom auth session (middleware already handles this, but double-check for safety)
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_SESSION_COOKIE);
  const isAuthenticated = authCookie?.value === "true";
  
  if (!isAuthenticated) {
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

