import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "School log in",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; verified?: string }>;
}

export default async function SchoolLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const authError =
    params.error === "auth_callback_failed"
      ? "Sign-in link expired or failed. Please log in again."
      : undefined;
  const authSuccess =
    params.verified === "true" || params.verified === "1"
      ? "Email confirmed successfully! Please log in below."
      : undefined;

  return <LoginForm accountType="school" authError={authError} authSuccess={authSuccess} />;
}
