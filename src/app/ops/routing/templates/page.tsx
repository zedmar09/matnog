import { DocumentScenarioBoundary } from "@/features/document-routing-records/components/document-scenario-boundary";
import { RoutingTemplateView } from "@/features/document-routing-records/views/routing-template-view";

export const metadata = { title: "Routing templates · Staff workspace" };

export default function Page() {
  return (
    <DocumentScenarioBoundary
      emptyTitle="No routing templates in this sample state"
      emptyDescription="Restore the normal sample state to review the template editor."
    >
      <RoutingTemplateView />
    </DocumentScenarioBoundary>
  );
}
