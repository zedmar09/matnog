import { TreasuryAdjustmentFormView } from "@/features/payments-treasury/views/treasury-adjustment-form-view";

export const metadata = { title: "New treasury adjustment · Staff workspace" };

export default async function Page({ searchParams }: { searchParams: Promise<{ collectionId?: string }> }) {
  const { collectionId } = await searchParams;
  return <TreasuryAdjustmentFormView initialCollectionId={collectionId} />;
}
