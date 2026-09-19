import { ServiceDeskView } from "@/features/citizen-service-desk/views/service-desk-view";
export const metadata = { title: "Assigned service request" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServiceDeskView screen="staff-detail" recordId={id} />;
}
