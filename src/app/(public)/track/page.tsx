import { TrackingView } from "@/features/request-tracking/views/tracking-view";
export const metadata = { title: "Track a request" };
export default async function Page({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  const { reference } = await searchParams;
  return <TrackingView initialReference={typeof reference === "string" ? reference : ""} />;
}
