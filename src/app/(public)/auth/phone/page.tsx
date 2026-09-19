import { getService } from "@/features/service-directory/data/services";
import { sanitizeReturnPath } from "@/features/unified-account-and-id/services/account-navigation";
import { PhoneAuthView } from "@/features/unified-account-and-id/views/phone-auth-view";
export const metadata = { title: "Demo sign-in" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; returnTo?: string }>;
}) {
  const { service, returnTo } = await searchParams;
  return (
    <PhoneAuthView
      serviceSlug={typeof service === "string" ? getService(service)?.slug : undefined}
      returnTo={typeof returnTo === "string" ? sanitizeReturnPath(returnTo) : undefined}
    />
  );
}
