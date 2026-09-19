import { ServiceDeskView } from "@/features/citizen-service-desk/views/service-desk-view";
export const metadata = { title: "Service desk inbox" };
export default function Page() {
  return <ServiceDeskView screen="inbox" />;
}
