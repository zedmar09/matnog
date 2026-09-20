import { AdminRecordView } from "@/features/platform-administration/views/admin-record-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminRecordView section="audit" recordId={id} />;
}
