import { BudgetFormView } from "@/features/budget-accounting/views/budget-form-view";
export default async function Page({ searchParams }: { searchParams: Promise<{ obligation?: string }> }) {
  const { obligation } = await searchParams;
  return <BudgetFormView kind="disbursement" prefillReference={obligation} />;
}
