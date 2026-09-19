import { ProjectMonitoringWorkspace } from "@/features/projects-procurement-monitoring/views/project-monitoring-workspace";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectMonitoringWorkspace screen="inspections" recordId={id} />;
}
