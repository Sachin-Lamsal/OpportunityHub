import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth/admin";

export const metadata = {
  title: "Admin",
};

// Admin pages read the signed-in administrator from the database on every
// request; they must never be prerendered.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // One call resolves both "is this an administrator?" and "who is signed in?".
  const admin = await getCurrentAdmin();

  if (!admin) {
    // Signed-out callers never reach this layout (the proxy redirects /admin),
    // so an absent admin record means "not an administrator".
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/admin/dashboard" className="font-medium text-indigo-600 hover:text-indigo-700">
                Discovery queue
              </Link>
              <Link href="/admin/publisher-review" className="font-medium text-indigo-600 hover:text-indigo-700">
                Publisher review
              </Link>
              <span className="text-slate-600">{admin.email}</span>
            </div>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
