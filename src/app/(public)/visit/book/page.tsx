import { TourismWorkspaceView } from "@/features/tourism-maritime-operations/views/tourism-workspace-view";
export default async function Page({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  const { destination } = await searchParams;
  return <TourismWorkspaceView mode="booking" recordId={destination} />;
}
