import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "School log in",
};

export default function SchoolLoginPage() {
  return <LoginForm accountType="school" />;
}
