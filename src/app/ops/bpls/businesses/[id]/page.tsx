import { BusinessRegistryDetailView } from "@/features/business-permits-licensing/views/business-registry-detail-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessRegistryDetailView businessId={id} />;
}
