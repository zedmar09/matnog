import { ScenarioWorkspaceView } from "@/features/platform-administration/views/admin-workspaces";
import { WorkspaceSessionProvider } from "@/shared/providers/workspace-session-provider";

export default function Page() {
  return (
    <WorkspaceSessionProvider>
      <ScenarioWorkspaceView />
    </WorkspaceSessionProvider>
  );
}
