import { ProjectDetailView } from "@/features/projects-procurement-monitoring/views/project-detail-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetailView projectId={id} section="completion" />;
}
