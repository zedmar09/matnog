import { IdentityFormView } from "@/features/unified-account-and-id/views/identity-form-view";
export default async function Page({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const { account } = await searchParams;
  return <IdentityFormView kind="link" prefillAccount={account} />;
}
