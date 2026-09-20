import { ProjectRelatedFormView } from "@/features/projects-procurement-monitoring/views/project-related-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectRelatedFormView projectId={id} kind="billing" />;
}
