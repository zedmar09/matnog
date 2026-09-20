import { ProjectProcurementFormView } from "@/features/projects-procurement-monitoring/views/project-procurement-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectProcurementFormView projectId={id} />;
}
