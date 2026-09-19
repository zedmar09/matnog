import { TreasuryAssessmentFormView } from "@/features/payments-treasury/views/treasury-assessment-form-view";

export const metadata = { title: "Edit treasury assessment · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TreasuryAssessmentFormView assessmentId={id} />;
}
