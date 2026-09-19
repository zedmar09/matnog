import { TripFormView } from "@/features/tourism-maritime-operations/views/trip-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripFormView tripId={id} />;
}
