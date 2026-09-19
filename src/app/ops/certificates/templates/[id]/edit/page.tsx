import { CertificateTemplateEditView } from "@/features/barangay-certifications/views/certificate-template-edit-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CertificateTemplateEditView templateVersionId={id} />;
}
