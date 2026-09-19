import { BusinessFormView } from "@/features/business-permits-licensing/views/business-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BusinessFormView businessId={id} />;
}
