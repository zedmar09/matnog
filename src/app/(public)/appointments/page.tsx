import { ServiceDeskView } from "@/features/citizen-service-desk/views/service-desk-view";
export const metadata = { title: "Appointments" };
export default function Page() {
  return <ServiceDeskView screen="appointments" />;
}
