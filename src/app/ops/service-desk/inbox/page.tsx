import { ServiceRequestListView } from "@/features/citizen-service-desk/views/service-request-list-view";
export const metadata = { title: "Citizen support requests · Staff workspace" };
export default function Page() {
  return <ServiceRequestListView />;
}
