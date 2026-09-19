import { CloudRain, MapPinned } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";

import { localDisasterRepository as repository } from "../services/local-disaster-repository";

export function PublicDisasterAdvisoryView({ activityId }: { activityId: string }) {
  const activity = repository.activity(activityId);
  if (!activity) {
    return (
      <EmptyState
        icon={CloudRain}
        title="Advisory unavailable"
        description="The requested public advisory could not be found."
      />
    );
  }
  return (
    <>
      <PageHeader title={activity.name} description={activity.summary} parent="Advisories" parentHref="/advisories" />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <CloudRain className="text-primary" />
          <span className="eyebrow mt-3 block">{activity.advisoryReference}</span>
          <h2 className="mt-1">Official situation update</h2>
          <dl className="registry-facts mt-6">
            <Fact label="Source" value={activity.leadOffice} />
            <Fact label="Updated" value={activity.updatedAt} />
            <Fact label="Affected barangays" value={activity.affectedBarangays.join(", ")} />
            <Fact label="Status" value={activity.status} />
          </dl>
        </ContentPanel>
        <ContentPanel as="aside">
          <MapPinned className="text-primary" />
          <h2 className="mt-3">Community guidance</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
            <li>Follow official municipal and barangay instructions for your location.</li>
            <li>Prepare essential medicine, water, identification, and household supplies.</li>
            <li>Proceed only to the evacuation center assigned by local response personnel.</li>
            <li>Monitor verified updates from the Municipality of Matnog and partner agencies.</li>
          </ul>
        </ContentPanel>
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="muted font-semibold text-xs uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 font-medium text-sm">{value}</dd>
    </div>
  );
}
