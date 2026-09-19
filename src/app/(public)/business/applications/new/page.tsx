import type { BusinessApplicationPathId } from "@/features/business-permits-licensing/types/business-journey";
import { BusinessApplicationWizardWireframeView } from "@/features/business-permits-licensing/views/business-application-wizard-wireframe-view";

const PATHS = new Set<BusinessApplicationPathId>(["new", "renewal", "amendment", "closure"]);

export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const pathId = PATHS.has(type as BusinessApplicationPathId) ? (type as BusinessApplicationPathId) : "new";
  return <BusinessApplicationWizardWireframeView pathId={pathId} />;
}
