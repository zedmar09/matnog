import { BusinessApplicationTrackerWireframeView } from "@/features/business-permits-licensing/views/business-application-tracker-wireframe-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessApplicationTrackerWireframeView applicationId={id} />;
}
