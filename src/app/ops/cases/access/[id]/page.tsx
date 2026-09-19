import { AccessDetailView } from "@/features/restricted-case-management/views/access-detail-view";

export const metadata = { title: "Case access assignment" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccessDetailView assignmentId={id} />;
}
