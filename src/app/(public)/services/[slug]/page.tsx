import { notFound } from "next/navigation";

import { getService, SERVICES } from "@/features/service-directory/data/services";
import { ServiceDetailView } from "@/features/service-directory/views/service-detail-view";

export const dynamicParams = false;
export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: getService(slug)?.title ?? "Service not found" };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();
  return <ServiceDetailView service={service} />;
}
