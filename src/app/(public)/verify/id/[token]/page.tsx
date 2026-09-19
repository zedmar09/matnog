import { PublicIdVerificationView } from "@/features/unified-account-and-id/views/public-id-verification-view";

export const metadata = { title: "Verify municipal ID" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicIdVerificationView token={token} />;
}
