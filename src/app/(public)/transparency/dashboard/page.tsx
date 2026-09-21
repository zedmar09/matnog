import { ReportDashboardView } from "@/features/gis-reporting-oversight/views/report-dashboard-view";

export const metadata = { title: "Public information dashboard" };

export default function Page() {
  return (
    <div className="site-container page-content">
      <ReportDashboardView />
    </div>
  );
}
