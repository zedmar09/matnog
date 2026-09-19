import { notFound } from "next/navigation";

import { getService, SERVICES } from "@/features/service-directory/data/services";
import { ServiceRequestView } from "@/features/service-requests/views/service-request-view";

export const dynamicParams = false;
export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Request ${getService(slug)?.title ?? "service"}` };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const { type } = await searchParams;
  const service = getService(slug);
  if (!service) notFound();
  return <ServiceRequestView service={service} requestType={type} />;
}
