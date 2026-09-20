import { BarangayPlanDetailView } from "@/features/development-planning/views/barangay-plan-detail-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BarangayPlanDetailView planId={id} />;
}
