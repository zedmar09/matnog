import { DocumentScenarioBoundary } from "@/features/document-routing-records/components/document-scenario-boundary";
import { DocumentRegisterView } from "@/features/document-routing-records/views/document-register-view";

export const metadata = { title: "Document register · Staff workspace" };

export default function Page() {
  return (
    <DocumentScenarioBoundary>
      <DocumentRegisterView />
    </DocumentScenarioBoundary>
  );
}
