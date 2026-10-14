import AuthPortalChooser from "@/components/auth/AuthPortalChooser";

export const metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AuthPortalChooser mode="login" error={error} />;
}
