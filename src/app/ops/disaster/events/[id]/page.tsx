import { ActivityDetailView } from "@/features/disaster-evacuation-relief/views/activity-detail-view";

export const metadata = { title: "Disaster response activity" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ActivityDetailView activityId={id} />;
}
