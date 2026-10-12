import { redirect } from "next/navigation";
import { getProfile } from "@/lib/actions/auth";
import { getOpportunities } from "@/lib/queries/opportunities";
import OnboardingWizardClient from "@/components/onboarding/OnboardingWizardClient";

export const metadata = {
  title: "Personalize Your Profile — OpportunityHub",
};

export default async function OnboardingPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login/student");
  }

  if (profile.account_type !== "student") {
    redirect("/dashboard");
  }

  if (profile.onboarding_completed) {
    redirect("/dashboard");
  }

  const opportunities = await getOpportunities({ limit: 40 });

  return <OnboardingWizardClient initialOpportunities={opportunities} />;
}
