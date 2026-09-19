import { CaseDetailView } from "@/features/restricted-case-management/views/case-detail-view";

export const metadata = { title: "Case record" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseDetailView caseId={id} />;
}
