import { DocumentScenarioBoundary } from "@/features/document-routing-records/components/document-scenario-boundary";
import { RoutingInboxView } from "@/features/document-routing-records/views/routing-inbox-view";

export const metadata = { title: "Routing inbox · Staff workspace" };

export default function Page() {
  return (
    <DocumentScenarioBoundary
      emptyTitle="Routing inbox is clear"
      emptyDescription="No document tasks are currently assigned."
    >
      <RoutingInboxView />
    </DocumentScenarioBoundary>
  );
}
