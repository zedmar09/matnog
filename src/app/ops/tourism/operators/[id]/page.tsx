import { OperatorDetailView } from "@/features/tourism-maritime-operations/views/operator-detail-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OperatorDetailView operatorId={id} />;
}
