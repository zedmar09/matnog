import { LedgerFormView } from "@/features/sectoral-assistance/views/ledger-form-view";

export const metadata = { title: "Edit ledger entry" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LedgerFormView entryId={id} />;
}
