import { AnalyticsFormView } from "@/features/gis-reporting-oversight/views/analytics-form-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnalyticsFormView kind="report" recordId={id} />;
}
