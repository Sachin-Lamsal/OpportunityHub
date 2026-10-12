import ActivityForm from "@/components/portfolio/ActivityForm";
import { getOpportunityById, getOpportunities } from "@/lib/queries/opportunities";

export const metadata = {
  title: "Add activity to portfolio",
};

interface AddActivityPageProps {
  searchParams: Promise<{
    opportunityId?: string;
  }>;
}

export default async function AddActivityPage({ searchParams }: AddActivityPageProps) {
  const { opportunityId } = await searchParams;
  const [selectedOpportunity, opportunities] = await Promise.all([
    opportunityId ? getOpportunityById(opportunityId) : Promise.resolve(null),
    getOpportunities({ limit: 50 }),
  ]);

  return (
    <ActivityForm
      initialOpportunity={selectedOpportunity}
      availableOpportunities={opportunities}
    />
  );
}
