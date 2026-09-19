import { DistributionDetailView } from "@/features/disaster-evacuation-relief/views/distribution-detail-view";

export const metadata = { title: "Relief distribution" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DistributionDetailView distributionId={id} />;
}
