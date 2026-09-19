import { DocumentEditView } from "@/features/document-routing-records/views/document-edit-view";

export const metadata = { title: "Edit document · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentEditView documentId={id} />;
}
