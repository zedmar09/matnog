import { getService } from "@/features/service-directory/data/services";
import { sanitizeReturnPath } from "@/features/unified-account-and-id/services/account-navigation";
import { VerifyAuthView } from "@/features/unified-account-and-id/views/verify-auth-view";

export const metadata = { title: "Verify demo code" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; returnTo?: string }>;
}) {
  const { service, returnTo } = await searchParams;
  return (
    <VerifyAuthView
      serviceSlug={typeof service === "string" ? getService(service)?.slug : undefined}
      returnTo={typeof returnTo === "string" ? sanitizeReturnPath(returnTo) : undefined}
    />
  );
}
