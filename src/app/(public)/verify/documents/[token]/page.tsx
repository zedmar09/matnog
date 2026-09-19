import { DocumentVerificationWireframeView } from "@/features/barangay-certifications/views/document-verification-wireframe-view";

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <DocumentVerificationWireframeView token={token} />;
}
