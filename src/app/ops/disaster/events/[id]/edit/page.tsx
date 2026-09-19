import { ActivityFormView } from "@/features/disaster-evacuation-relief/views/activity-form-view";

export const metadata = { title: "Edit disaster response activity" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ActivityFormView activityId={id} />;
}
