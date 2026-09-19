import { DocumentScenarioBoundary } from "@/features/document-routing-records/components/document-scenario-boundary";
import { DocumentArchiveView } from "@/features/document-routing-records/views/document-archive-view";

export const metadata = { title: "Records archive · Staff workspace" };

export default function Page() {
  return (
    <DocumentScenarioBoundary
      emptyTitle="Records archive is empty"
      emptyDescription="No released or held documents are available."
    >
      <DocumentArchiveView />
    </DocumentScenarioBoundary>
  );
}
