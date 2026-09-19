import { AdvisoryFormView } from "@/features/tourism-maritime-operations/views/advisory-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdvisoryFormView advisoryId={id} />;
}
