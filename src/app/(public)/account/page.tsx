import { redirect } from "next/navigation";

import { getService } from "@/features/service-directory/data/services";

export default async function Page({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const serviceSlug = typeof service === "string" ? getService(service)?.slug : undefined;
  redirect(serviceSlug ? `/account/profile?service=${serviceSlug}` : "/account/profile");
}
