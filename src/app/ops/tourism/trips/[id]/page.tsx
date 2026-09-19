import { TripDetailView } from "@/features/tourism-maritime-operations/views/trip-detail-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripDetailView tripId={id} />;
}
