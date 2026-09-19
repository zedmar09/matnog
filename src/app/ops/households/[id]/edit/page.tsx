import { HouseholdEditView } from "@/features/resident-household-registry/views/household-edit-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HouseholdEditView householdId={id} />;
}
