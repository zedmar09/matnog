import { CenterDetailView } from "@/features/disaster-evacuation-relief/views/center-detail-view";

export const metadata = { title: "Evacuation center" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CenterDetailView centerId={id} />;
}
