import { ServiceDeskView } from "@/features/citizen-service-desk/views/service-desk-view";
export const metadata = { title: "Counter queue" };
export default function Page() {
  return <ServiceDeskView screen="queue" />;
}
