import { ApplicationFormView } from "@/features/business-permits-licensing/views/application-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ApplicationFormView applicationId={id} />;
}
