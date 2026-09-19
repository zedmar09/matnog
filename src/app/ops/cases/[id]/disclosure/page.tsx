import { DisclosureView } from "@/features/restricted-case-management/views/disclosure-view";

export const metadata = { title: "Case disclosure review" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DisclosureView caseId={id} />;
}
