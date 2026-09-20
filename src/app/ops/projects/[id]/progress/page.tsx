import { ProjectProgressFormView } from "@/features/projects-procurement-monitoring/views/project-progress-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectProgressFormView projectId={id} />;
}
