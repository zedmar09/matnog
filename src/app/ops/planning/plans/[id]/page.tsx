import { MunicipalPlanDetailView } from "@/features/development-planning/views/municipal-plan-detail-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MunicipalPlanDetailView planId={id} />;
}
