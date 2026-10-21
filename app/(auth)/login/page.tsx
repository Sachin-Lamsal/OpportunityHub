import AuthPortalChooser from "@/components/auth/AuthPortalChooser";

export const metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verified?: string }>;
}) {
  const { error, verified } = await searchParams;
  return (
    <AuthPortalChooser
      mode="login"
      error={error}
      verified={verified === "true" || verified === "1"}
    />
  );
}
