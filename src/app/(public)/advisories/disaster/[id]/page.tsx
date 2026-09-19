import { PublicDisasterAdvisoryView } from "@/features/disaster-evacuation-relief/views/public-disaster-advisory-view";

export const metadata = { title: "Disaster advisory" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicDisasterAdvisoryView activityId={id} />;
}
