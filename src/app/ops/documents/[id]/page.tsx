import { DocumentScenarioBoundary } from "@/features/document-routing-records/components/document-scenario-boundary";
import { DocumentDetailView } from "@/features/document-routing-records/views/document-detail-view";

export const metadata = { title: "Document record · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <DocumentScenarioBoundary
      emptyTitle="Document unavailable in this sample state"
      emptyDescription="The selected empty state contains no document detail."
    >
      <DocumentDetailView documentId={id} />
    </DocumentScenarioBoundary>
  );
}
