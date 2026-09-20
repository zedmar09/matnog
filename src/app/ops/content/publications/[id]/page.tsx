import { PublishingRecordView } from "@/features/public-information-transparency/views/publishing-record-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublishingRecordView recordId={id} />;
}
