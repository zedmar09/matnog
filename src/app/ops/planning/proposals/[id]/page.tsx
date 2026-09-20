import { PlanningProposalDetailView } from "@/features/development-planning/views/planning-proposal-detail-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanningProposalDetailView proposalId={id} />;
}
