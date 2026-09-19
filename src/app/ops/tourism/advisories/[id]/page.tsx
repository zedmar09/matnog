import { AdvisoryDetailView } from "@/features/tourism-maritime-operations/views/advisory-detail-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdvisoryDetailView advisoryId={id} />;
}
