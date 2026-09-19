import { CertificateReviewWireframeView } from "@/features/barangay-certifications/views/certificate-review-wireframe-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CertificateReviewWireframeView requestId={id} />;
}
