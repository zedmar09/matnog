import { DistributionFormView } from "@/features/disaster-evacuation-relief/views/distribution-form-view";

export const metadata = { title: "Edit relief distribution" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DistributionFormView distributionId={id} />;
}
