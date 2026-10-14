import AuthPortalChooser from "@/components/auth/AuthPortalChooser";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return <AuthPortalChooser mode="signup" />;
}
