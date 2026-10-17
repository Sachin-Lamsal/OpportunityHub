import AppNav from "@/components/layout/AppNav";
import AppFooter from "@/components/layout/AppFooter";
import { getProfile } from "@/lib/actions/auth";
import type { AccountType } from "@/lib/types";

// Every page in this group depends on the signed-in user (and therefore on
// cookies and the database), so none of them may be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  const isLoggedIn = Boolean(profile);
  const accountType: AccountType = profile?.account_type ?? "student";

  return (
    <div className="flex min-h-full flex-col">
      <AppNav accountType={accountType} isLoggedIn={isLoggedIn} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <AppFooter />
    </div>
  );
}
