import { RoutingTemplateDetailView } from "@/features/document-routing-records/views/routing-template-detail-view";

export const metadata = { title: "Routing template · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoutingTemplateDetailView templateId={id} />;
}
