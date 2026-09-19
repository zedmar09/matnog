import { SectorFormView } from "@/features/sectoral-assistance/views/sector-form-view";

export const metadata = { title: "Edit sector registration" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SectorFormView recordId={id} />;
}
