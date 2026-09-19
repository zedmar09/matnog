import { PersonDetailView } from "@/features/resident-household-registry/views/person-detail-view";

export const metadata = { title: "Resident record · Staff workspace" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PersonDetailView personId={id} />;
}
