import { ResidentEditView } from "@/features/resident-household-registry/views/resident-edit-view";

export const metadata = { title: "Edit profile · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResidentEditView personId={id} />;
}
