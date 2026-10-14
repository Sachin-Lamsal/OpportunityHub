import SignupForm from "@/components/auth/SignupForm";

export const metadata = {
  title: "School sign up",
};

export default function SchoolSignupPage() {
  return <SignupForm accountType="school" />;
}
