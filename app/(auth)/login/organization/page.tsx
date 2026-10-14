import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Organization log in",
};

export default function OrganizationLoginPage() {
  return <LoginForm accountType="organization" />;
}
