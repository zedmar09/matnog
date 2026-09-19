import { SectoralAssistanceView } from "@/features/sectoral-assistance/views/sectoral-assistance-view";
export const metadata = { title: "Sector status record" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SectoralAssistanceView screen="sector-detail" recordId={id} />;
}
