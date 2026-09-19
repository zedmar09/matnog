import { PaymentReceiptView } from "@/features/payments-treasury/views/payment-receipt-view";

export const metadata = { title: "Sample payment receipt" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentReceiptView receiptId={id} />;
}
