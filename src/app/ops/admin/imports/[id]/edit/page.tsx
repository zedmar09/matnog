import { AdminFormView } from "@/features/platform-administration/views/admin-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminFormView section="imports" recordId={id} />;
}
