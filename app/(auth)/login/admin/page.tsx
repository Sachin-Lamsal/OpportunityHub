import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/auth/AdminLoginForm";
import { getCurrentAdmin } from "@/lib/auth/admin";

export const metadata = {
  title: "Administrator sign in",
};

interface AdminLoginPageProps {
  searchParams: Promise<{ error?: string; verified?: string }>;
}

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const admin = await getCurrentAdmin();
  if (admin) {
    redirect("/admin/dashboard");
  }

  const params = await searchParams;
  const authError =
    params.error === "auth_callback_failed"
      ? "Sign-in link expired or failed. Please sign in again."
      : undefined;
  const authSuccess =
    params.verified === "true" || params.verified === "1"
      ? "Email confirmed successfully! Please sign in below."
      : undefined;

  return <AdminLoginForm authError={authError} authSuccess={authSuccess} />;
}
