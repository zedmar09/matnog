import { BarangayPlanFormView } from "@/features/development-planning/views/barangay-plan-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BarangayPlanFormView planId={id} />;
}
