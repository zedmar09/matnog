import { ServiceAppointmentListView } from "@/features/citizen-service-desk/views/service-appointment-list-view";

export const metadata = { title: "Citizen support appointments · Staff workspace" };

export default function Page() {
  return <ServiceAppointmentListView />;
}
