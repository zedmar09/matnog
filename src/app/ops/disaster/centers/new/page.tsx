import { CenterFormView } from "@/features/disaster-evacuation-relief/views/center-form-view";

export const metadata = { title: "New evacuation center" };

export default async function Page({ searchParams }: { searchParams: Promise<{ activityId?: string }> }) {
  const { activityId } = await searchParams;
  return <CenterFormView defaultActivityId={activityId} />;
}
