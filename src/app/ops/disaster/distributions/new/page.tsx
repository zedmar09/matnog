import { DistributionFormView } from "@/features/disaster-evacuation-relief/views/distribution-form-view";

export const metadata = { title: "New relief distribution" };

export default async function Page({ searchParams }: { searchParams: Promise<{ activityId?: string }> }) {
  const { activityId } = await searchParams;
  return <DistributionFormView defaultActivityId={activityId} />;
}
