import { SectoralAssistanceView } from "@/features/sectoral-assistance/views/sectoral-assistance-view";
export const metadata = { title: "Assistance programs" };
export default function Page() {
  return <SectoralAssistanceView screen="programs" />;
}
