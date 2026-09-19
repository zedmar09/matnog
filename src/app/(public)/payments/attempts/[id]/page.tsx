import { PaymentAttemptView } from "@/features/payments-treasury/views/payment-attempt-view";

export const metadata = { title: "Payment attempt" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentAttemptView attemptId={id} />;
}
