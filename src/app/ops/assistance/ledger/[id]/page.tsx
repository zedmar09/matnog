import { LedgerDetailView } from "@/features/sectoral-assistance/views/ledger-detail-view";

export const metadata = { title: "Ledger entry" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LedgerDetailView entryId={id} />;
}
