import { ServiceRequestFormView } from "@/features/citizen-service-desk/views/service-request-form-view";

export const metadata = { title: "Edit citizen request · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServiceRequestFormView requestId={id} />;
}
