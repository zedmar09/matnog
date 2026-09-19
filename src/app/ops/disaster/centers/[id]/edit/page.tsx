import { CenterFormView } from "@/features/disaster-evacuation-relief/views/center-form-view";

export const metadata = { title: "Edit evacuation center" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CenterFormView centerId={id} />;
}
