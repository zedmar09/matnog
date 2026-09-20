import { IdentityFormView } from "@/features/unified-account-and-id/views/identity-form-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IdentityFormView kind="template" recordId={id} />;
}
