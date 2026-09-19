import { CertificateTrackerWireframeView } from "@/features/barangay-certifications/views/certificate-tracker-wireframe-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CertificateTrackerWireframeView requestId={id} />;
}
