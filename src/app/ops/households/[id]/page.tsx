import { HouseholdDetailView } from "@/features/resident-household-registry/views/household-detail-view";

export const metadata = { title: "Household record · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HouseholdDetailView householdId={id} />;
}
