import { BusinessDetailWireframeView } from "@/features/business-permits-licensing/views/business-detail-wireframe-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessDetailWireframeView businessId={id} />;
}
