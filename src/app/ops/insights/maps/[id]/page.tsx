import { AnalyticsRecordView } from "@/features/gis-reporting-oversight/views/analytics-record-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnalyticsRecordView kind="layer" recordId={id} />;
}
