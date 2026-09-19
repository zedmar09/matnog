import { DocumentScenarioBoundary } from "@/features/document-routing-records/components/document-scenario-boundary";
import { DocumentArchiveView } from "@/features/document-routing-records/views/document-archive-view";

export const metadata = { title: "Archive preview · Staff workspace" };

export default function Page() {
  return (
    <DocumentScenarioBoundary
      emptyTitle="Archive preview is empty"
      emptyDescription="No released or held sample documents are available in this selected state."
    >
      <DocumentArchiveView />
    </DocumentScenarioBoundary>
  );
}
