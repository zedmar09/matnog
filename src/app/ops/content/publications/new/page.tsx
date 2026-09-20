import type { PublicationKind } from "@/features/public-information-transparency/data/publication-fixtures";
import { PublishingFormView } from "@/features/public-information-transparency/views/publishing-form-view";
export default async function Page({ searchParams }: { searchParams: Promise<{ kind?: PublicationKind }> }) {
  const { kind } = await searchParams;
  return <PublishingFormView initialKind={kind} />;
}
