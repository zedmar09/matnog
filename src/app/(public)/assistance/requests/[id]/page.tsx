import { SectoralAssistanceView } from "@/features/sectoral-assistance/views/sectoral-assistance-view";
export const metadata = { title: "Assistance request" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SectoralAssistanceView screen="request" recordId={id} />;
}
