import { ServiceQueueView } from "@/features/citizen-service-desk/views/service-queue-view";
export const metadata = { title: "Citizen support queue · Staff workspace" };
export default function Page() {
  return <ServiceQueueView />;
}
