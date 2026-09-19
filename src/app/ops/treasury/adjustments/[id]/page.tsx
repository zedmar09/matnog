import { TreasuryAdjustmentView } from "@/features/payments-treasury/views/treasury-adjustment-view";

export const metadata = { title: "Treasury adjustment review · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TreasuryAdjustmentView adjustmentId={id} />;
}
