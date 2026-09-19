import { TreasuryReceiptView } from "@/features/payments-treasury/views/treasury-receipt-view";

export const metadata = { title: "Treasury receipt history · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TreasuryReceiptView receiptId={id} />;
}
