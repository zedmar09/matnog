import { AssessmentFormView } from "@/features/disaster-evacuation-relief/views/assessment-form-view";

export const metadata = { title: "Edit damage assessment" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssessmentFormView assessmentId={id} />;
}
