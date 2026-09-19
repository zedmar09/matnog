import { TreasuryCollectionDetailView } from "@/features/payments-treasury/views/treasury-collection-detail-view";

export const metadata = { title: "Treasury collection · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TreasuryCollectionDetailView collectionId={id} />;
}
