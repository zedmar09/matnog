import { AdvisoryDetailView } from "@/features/public-information-transparency/views/publication-views";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdvisoryDetailView advisoryId={id} />;
}
