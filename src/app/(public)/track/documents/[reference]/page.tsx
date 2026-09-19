import { DocumentTrackingView } from "@/features/document-routing-records/views/document-tracking-view";

export const metadata = { title: "Track a document" };

export default async function Page({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <DocumentTrackingView reference={reference} />;
}
