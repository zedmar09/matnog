import { ServiceRequestDetailView } from "@/features/citizen-service-desk/views/service-request-detail-view";
export const metadata = { title: "Citizen support request · Staff workspace" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServiceRequestDetailView requestId={id} />;
}
