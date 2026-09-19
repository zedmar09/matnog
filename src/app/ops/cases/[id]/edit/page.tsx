import { CaseFormView } from "@/features/restricted-case-management/views/case-form-view";

export const metadata = { title: "Edit case" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseFormView caseId={id} />;
}
