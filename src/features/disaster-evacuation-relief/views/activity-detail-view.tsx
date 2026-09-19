"use client";

import { type ReactNode, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Building2, ClipboardCheck, PackageOpen, Pencil, Plus, Trash2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { ActivityPriority, ActivityStatus } from "../types/disaster-records";

const STATUS_TONE: Record<ActivityStatus, StatusTone> = {
  Monitoring: "pending",
  "Active response": "warning",
  Contained: "success",
  Closed: "neutral",
};
const PRIORITY_TONE: Record<ActivityPriority, StatusTone> = {
  Low: "neutral",
  Moderate: "pending",
  High: "warning",
  Critical: "destructive",
};

export function ActivityDetailView({ activityId }: { activityId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const activity = repository.activity(activityId);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Disaster response activities are not assigned to this role"
        description="Choose the municipal or barangay role."
      />
    );
  if (!activity)
    return (
      <PermissionState
        title="Activity unavailable"
        description="The requested operational record was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/disaster/events">Back to activities</Link>
          </Button>
        }
      />
    );

  const centers = repository.activityCenters(activity.id);
  const distributions = repository.activityDistributions(activity.id);
  const assessments = repository.activityAssessments(activity.id);

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">Disaster &amp; Relief</span>
          <h1>{activity.name}</h1>
          <p>
            {activity.id} · {activity.type}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/disaster/events">
              <ArrowLeft />
              Back to activities
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/disaster/events/${activity.id}/edit`}>
              <Pencil />
              Edit activity
            </Link>
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Current situation</span>
              <h2 className="mt-1">{activity.type}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={PRIORITY_TONE[activity.priority]}>{activity.priority}</StatusBadge>
              <StatusBadge tone={STATUS_TONE[activity.status]}>{activity.status}</StatusBadge>
            </div>
          </div>
          <p className="mt-5">{activity.summary}</p>
          <dl className="registry-facts mt-6">
            <Fact label="Affected barangays" value={activity.affectedBarangays.join(", ")} />
            <Fact label="Started at" value={activity.startedAt} />
            <Fact label="Lead office" value={activity.leadOffice} />
            <Fact label="Incident commander" value={activity.incidentCommander} />
          </dl>
        </ContentPanel>

        <ContentPanel as="aside">
          <ClipboardCheck className="text-primary" />
          <h2 className="mt-3">Operational record</h2>
          <p className="muted">References and update times remain attached to this activity.</p>
          <PanelDivider />
          <dl className="grid gap-5">
            <Fact label="Activity reference" value={activity.id} />
            <Fact label="Advisory or report" value={activity.advisoryReference} />
            <Fact label="Last updated" value={activity.updatedAt} />
          </dl>
        </ContentPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <RelatedPanel
          title="Evacuation centers"
          icon={<Building2 className="text-primary" />}
          createHref={`/ops/disaster/centers/new?activityId=${activity.id}`}
          createLabel="Add center"
        >
          {centers.length ? (
            centers.map((item) => (
              <RelatedLink
                key={item.id}
                href={`/ops/disaster/centers/${item.id}`}
                title={item.name}
                meta={`${item.acceptedOccupants}/${item.capacity} occupants · ${item.status}`}
              />
            ))
          ) : (
            <p className="muted text-sm">No evacuation centers are linked.</p>
          )}
        </RelatedPanel>
        <RelatedPanel
          title="Damage assessments"
          icon={<ClipboardCheck className="text-primary" />}
          createHref={`/ops/disaster/assessments/new?activityId=${activity.id}`}
          createLabel="Add assessment"
        >
          {assessments.length ? (
            assessments.map((item) => (
              <RelatedLink
                key={item.id}
                href={`/ops/disaster/assessments/${item.id}`}
                title={item.residentName}
                meta={`${item.category} · ${item.status}`}
              />
            ))
          ) : (
            <p className="muted text-sm">No damage assessments are linked.</p>
          )}
        </RelatedPanel>
        <RelatedPanel
          title="Relief distributions"
          icon={<PackageOpen className="text-primary" />}
          createHref={`/ops/disaster/distributions/new?activityId=${activity.id}`}
          createLabel="Add distribution"
        >
          {distributions.length ? (
            distributions
              .slice(0, 4)
              .map((item) => (
                <RelatedLink
                  key={item.id}
                  href={`/ops/disaster/distributions/${item.id}`}
                  title={item.recipientName}
                  meta={`${item.round} · ${item.status}`}
                />
              ))
          ) : (
            <p className="muted text-sm">No relief distributions are linked.</p>
          )}
        </RelatedPanel>
      </div>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${activity.id}`}
        description="This removes the activity and its linked centers, distributions, and assessments from the current workspace."
        confirmLabel="Delete activity"
        destructive
        onConfirm={() => {
          repository.deleteActivity(activity.id);
          router.replace("/ops/disaster/events");
        }}
      />
    </>
  );
}

function RelatedPanel({
  title,
  icon,
  createHref,
  createLabel,
  children,
}: {
  title: string;
  icon: ReactNode;
  createHref: string;
  createLabel: string;
  children: ReactNode;
}) {
  return (
    <ContentPanel as="section">
      {icon}
      <div className="mt-3 flex items-center justify-between gap-3">
        <h2>{title}</h2>
        <Button asChild size="sm" variant="outline">
          <Link href={createHref}>
            <Plus />
            {createLabel}
          </Link>
        </Button>
      </div>
      <div className="mt-5 grid gap-3">{children}</div>
    </ContentPanel>
  );
}

function RelatedLink({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href} className="rounded-xl border p-4 transition-colors hover:border-primary">
      <strong>{title}</strong>
      <p className="muted mt-1 text-sm">{meta}</p>
    </Link>
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
