import { DevelopmentPlanningWorkspace } from "@/features/development-planning/views/development-planning-workspace";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DevelopmentPlanningWorkspace screen="proposal" recordId={id} />;
}
