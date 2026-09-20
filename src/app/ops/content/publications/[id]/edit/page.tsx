import { PublishingFormView } from "@/features/public-information-transparency/views/publishing-form-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublishingFormView recordId={id} />;
}
