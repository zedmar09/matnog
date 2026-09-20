import { PlanningProposalFormView } from "@/features/development-planning/views/planning-proposal-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanningProposalFormView proposalId={id} />;
}
