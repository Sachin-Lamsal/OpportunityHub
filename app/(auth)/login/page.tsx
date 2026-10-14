import AuthPortalChooser from "@/components/auth/AuthPortalChooser";

export const metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return <AuthPortalChooser mode="login" />;
}
