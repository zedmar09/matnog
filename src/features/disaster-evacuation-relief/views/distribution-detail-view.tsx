"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, CalendarDays, PackageCheck, Pencil, Trash2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localDisasterRepository as repository } from "../services/local-disaster-repository";
import type { DistributionStatus } from "../types/disaster-records";

const TONE: Record<DistributionStatus, StatusTone> = {
  Released: "success",
  "Pending confirmation": "pending",
  "Duplicate review": "warning",
  Cancelled: "neutral",
};

export function DistributionDetailView({ distributionId }: { distributionId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = repository.distribution(distributionId);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Relief distributions are not assigned to this role"
        description="Choose the municipal or barangay role."
      />
    );
  if (!item)
    return (
      <PermissionState
        title="Distribution unavailable"
        description="The requested relief distribution was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/disaster/distributions">Back to distributions</Link>
          </Button>
        }
      />
    );
  const activity = repository.activity(item.activityId);

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">Relief distribution</span>
          <h1>{item.id}</h1>
          <p>
            {item.recipientName} · {item.round}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/disaster/distributions">
              <ArrowLeft />
              Back to distributions
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/disaster/distributions/${item.id}/edit`}>
              <Pencil />
              Edit distribution
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
              <span className="eyebrow">Recipient and release</span>
              <h2 className="mt-1">{item.recipientName}</h2>
            </div>
            <StatusBadge tone={TONE[item.status]}>{item.status}</StatusBadge>
          </div>
          <dl className="registry-facts mt-6">
            <Fact label="Recipient reference" value={item.recipientId} />
            <Fact label="Barangay" value={item.barangay} />
            <Fact label="Distribution round" value={item.round} />
            <Fact label="Relief items" value={item.items} />
            <Fact label="Distribution site" value={item.distributionSite} />
            <Fact label="Activity" value={activity?.name ?? item.activityId} />
          </dl>
        </ContentPanel>
        <ContentPanel as="aside">
          <PackageCheck className="text-primary" />
          <h2 className="mt-3">Release record</h2>
          <p className="muted">The release time and acknowledgment remain attached to this distribution.</p>
          <PanelDivider />
          <dl className="grid gap-5">
            <Fact label="Acknowledgment" value={item.acknowledgment} />
            <Fact label="Released at" value={item.releasedAt} />
            <Fact label="Activity reference" value={item.activityId} />
          </dl>
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
            <CalendarDays size={17} className="text-primary" />
            Recorded in {item.round.toLocaleLowerCase()}
          </div>
        </ContentPanel>
      </div>
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${item.id}`}
        description="This removes the relief distribution record from the current workspace."
        confirmLabel="Delete distribution"
        destructive
        onConfirm={() => {
          repository.deleteDistribution(item.id);
          router.replace("/ops/disaster/distributions");
        }}
      />
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
