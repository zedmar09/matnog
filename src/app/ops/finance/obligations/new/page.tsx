import { BudgetFormView } from "@/features/budget-accounting/views/budget-form-view";
export default async function Page({ searchParams }: { searchParams: Promise<{ allocation?: string }> }) {
  const { allocation } = await searchParams;
  return <BudgetFormView kind="obligation" prefillReference={allocation} />;
}
