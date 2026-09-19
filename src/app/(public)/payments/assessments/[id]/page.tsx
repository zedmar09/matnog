import { PaymentAssessmentView } from "@/features/payments-treasury/views/payment-assessment-view";

export const metadata = { title: "Payment assessment" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PaymentAssessmentView assessmentId={id} />;
}
