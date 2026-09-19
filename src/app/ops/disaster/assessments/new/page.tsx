import { AssessmentFormView } from "@/features/disaster-evacuation-relief/views/assessment-form-view";

export const metadata = { title: "New damage assessment" };

export default async function Page({ searchParams }: { searchParams: Promise<{ activityId?: string }> }) {
  const { activityId } = await searchParams;
  return <AssessmentFormView defaultActivityId={activityId} />;
}
