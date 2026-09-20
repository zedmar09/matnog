import { IdTemplateDesignerView } from "@/features/unified-account-and-id/views/id-template-designer-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IdTemplateDesignerView templateId={id} />;
}
