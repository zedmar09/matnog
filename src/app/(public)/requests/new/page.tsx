import { ServiceDeskView } from "@/features/citizen-service-desk/views/service-desk-view";
export const metadata = { title: "New service request" };
export default function Page() {
  return <ServiceDeskView screen="intake" />;
}
