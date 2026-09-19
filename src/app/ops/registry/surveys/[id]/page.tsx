import { SurveyCaptureView } from "@/features/resident-household-registry/views/survey-capture-view";

export const metadata = { title: "Household survey · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SurveyCaptureView assignmentId={id} />;
}
