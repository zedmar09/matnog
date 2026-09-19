import { BplsApplicationReviewWireframeView } from "@/features/business-permits-licensing/views/bpls-application-review-wireframe-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BplsApplicationReviewWireframeView applicationId={id} />;
}
