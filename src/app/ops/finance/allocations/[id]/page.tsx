import { BudgetRecordView } from "@/features/budget-accounting/views/budget-record-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BudgetRecordView kind="allocation" recordId={id} />;
}
