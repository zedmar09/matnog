import { BudgetFormView } from "@/features/budget-accounting/views/budget-form-view";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BudgetFormView kind="allocation" recordId={id} />;
}
