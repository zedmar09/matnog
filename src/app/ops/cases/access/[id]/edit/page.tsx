import { AccessFormView } from "@/features/restricted-case-management/views/access-form-view";

export const metadata = { title: "Edit case access assignment" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccessFormView assignmentId={id} />;
}
