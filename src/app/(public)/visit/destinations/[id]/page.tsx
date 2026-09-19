import { TourismWorkspaceView } from "@/features/tourism-maritime-operations/views/tourism-workspace-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TourismWorkspaceView mode="destination" recordId={id} />;
}
