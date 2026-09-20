import { ProjectFormView } from "@/features/projects-procurement-monitoring/views/project-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectFormView projectId={id} />;
}
