import { DocumentScenarioBoundary } from "@/features/document-routing-records/components/document-scenario-boundary";
import { DocumentRegistrationView } from "@/features/document-routing-records/views/document-registration-view";

export const metadata = { title: "Register document · Staff workspace" };

export default function Page() {
  return (
    <DocumentScenarioBoundary
      emptyTitle="No sample registration workspace"
      emptyDescription="Restore the normal sample state to register a document."
    >
      <DocumentRegistrationView />
    </DocumentScenarioBoundary>
  );
}
