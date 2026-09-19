import { DocumentScenarioBoundary } from "@/features/document-routing-records/components/document-scenario-boundary";
import { DocumentRegistrationView } from "@/features/document-routing-records/views/document-registration-view";

export const metadata = { title: "Register document · Staff workspace" };

export default function Page() {
  return (
    <DocumentScenarioBoundary
      emptyTitle="Document registration unavailable"
      emptyDescription="Document registration is not available in the current workspace state."
    >
      <DocumentRegistrationView />
    </DocumentScenarioBoundary>
  );
}
