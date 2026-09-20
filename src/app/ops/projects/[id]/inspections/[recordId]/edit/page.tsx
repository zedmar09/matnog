import { ProjectRelatedFormView } from "@/features/projects-procurement-monitoring/views/project-related-form-view";

export default async function EditInspectionPage({ params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = await params;
  return <ProjectRelatedFormView projectId={id} recordId={recordId} kind="inspection" />;
}
