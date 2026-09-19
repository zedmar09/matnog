import { CertificateTemplateDetailView } from "@/features/barangay-certifications/views/certificate-template-detail-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CertificateTemplateDetailView templateVersionId={id} />;
}
