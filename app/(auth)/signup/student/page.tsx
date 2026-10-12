import SignupForm from "@/components/auth/SignupForm";

export const metadata = {
  title: "Student sign up",
};

export default function StudentSignupPage() {
  return <SignupForm accountType="student" />;
}
