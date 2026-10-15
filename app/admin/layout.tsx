import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRole) {
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
              <span className="text-slate-600">{user.email}</span>
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
