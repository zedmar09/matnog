import { TourismOperationsWorkspaceView } from "@/features/tourism-maritime-operations/views/tourism-workspace-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TourismOperationsWorkspaceView mode="partner" recordId={id} />;
}
