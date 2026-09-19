import { BudgetAccountingWorkspace } from "@/features/budget-accounting/views/budget-accounting-workspace";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BudgetAccountingWorkspace screen="disbursement" recordId={id} />;
}
