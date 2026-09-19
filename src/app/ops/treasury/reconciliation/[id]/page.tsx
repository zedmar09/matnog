import { TreasuryReconciliationDetailView } from "@/features/payments-treasury/views/treasury-reconciliation-detail-view";

export const metadata = { title: "Treasury settlement · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TreasuryReconciliationDetailView settlementId={id} />;
}
