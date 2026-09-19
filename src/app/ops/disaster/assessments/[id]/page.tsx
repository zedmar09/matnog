import { AssessmentDetailView } from "@/features/disaster-evacuation-relief/views/assessment-detail-view";

export const metadata = { title: "Damage assessment" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssessmentDetailView assessmentId={id} />;
}
