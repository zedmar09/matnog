import { permanentRedirect } from "next/navigation";

import { SERVICES } from "@/features/service-directory/data/services";

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

/**
 * The service page now carries what to prepare and how it works, so the
 * separate review step is redundant. Old links go straight to the request form.
 */
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/services/${slug}/request`);
}
