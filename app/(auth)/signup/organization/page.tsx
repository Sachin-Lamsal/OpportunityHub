import SignupForm from "@/components/auth/SignupForm";

export const metadata = {
  title: "Organization sign up",
};

export default function OrganizationSignupPage() {
  return <SignupForm accountType="organization" />;
}
