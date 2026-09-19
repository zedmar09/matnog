import { OperatorFormView } from "@/features/tourism-maritime-operations/views/operator-form-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OperatorFormView operatorId={id} />;
}
