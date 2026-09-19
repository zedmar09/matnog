import { ReportDetailView } from "@/features/gis-reporting-oversight/views/insight-workspaces";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetailView reportId={id} />;
}
