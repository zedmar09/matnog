import { ServiceDirectoryView } from "@/features/service-directory/views/service-directory-view";
export const metadata = { title: "Services" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; audience?: string }> }) {
  const params = await searchParams;
  return (
    <ServiceDirectoryView
      key={`${params.q ?? ""}-${params.audience ?? ""}`}
      initialQuery={typeof params.q === "string" ? params.q : ""}
      initialAudience={typeof params.audience === "string" ? params.audience : "all"}
    />
  );
}
