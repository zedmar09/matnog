"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, CalendarClock, KeyRound, Pencil, ShieldOff, Trash2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localRestrictedCaseRepository as repository } from "../services/local-restricted-case-repository";
import type { AccessStatus } from "../types/restricted-case";

const TONE: Record<AccessStatus, StatusTone> = { Active: "success", Revoked: "destructive", Expired: "neutral" };

export function AccessDetailView({ assignmentId }: { assignmentId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [notice, setNotice] = useState<string>();
  const item = repository.assignment(assignmentId);
  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Case access management is not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  if (!item)
    return (
      <PermissionState
        title="Access assignment unavailable"
        description="The requested assignment was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/cases/access">Back to access</Link>
          </Button>
        }
      />
    );
  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">Case access assignment</span>
          <h1>{item.staffName}</h1>
          <p>
            {item.id} · {item.caseClass}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/cases/access">
              <ArrowLeft />
              Back to access
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/cases/access/${item.id}/edit`}>
              <Pencil />
              Edit assignment
            </Link>
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="eyebrow">Staff and scope</span>
              <h2 className="mt-1">{item.caseClass}</h2>
            </div>
            <StatusBadge tone={TONE[item.status]}>{item.status}</StatusBadge>
          </div>
          <dl className="registry-facts mt-6">
            <Fact label="Staff member" value={item.staffName} />
            <Fact label="Staff role" value={item.staffRole} />
            <Fact label="Barangay / scope" value={item.scope} />
            <Fact label="Case class" value={item.caseClass} />
          </dl>
          <PanelDivider />
          <Fact label="Access purpose" value={item.purpose} />
        </ContentPanel>
        <ContentPanel as="aside">
          <KeyRound className="text-primary" />
          <h2 className="mt-3">Assignment validity</h2>
          <p className="muted">Access remains tied to the recorded purpose, class, and scope.</p>
          <PanelDivider />
          <dl className="grid gap-5">
            <Fact label="Granted at" value={item.grantedAt} />
            <Fact label="Expires at" value={item.expiresAt} />
            <Fact label="Current status" value={item.status} />
          </dl>
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
            <CalendarClock size={17} className="text-primary" />
            Assignment period recorded
          </div>
          {item.status === "Active" && (
            <Button variant="outline" className="mt-5 text-destructive" onClick={() => setConfirmRevoke(true)}>
              <ShieldOff />
              Revoke access
            </Button>
          )}
        </ContentPanel>
      </div>
      <ConfirmationDialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title={`Revoke ${item.id}`}
        description="This changes the assignment status to Revoked while retaining the access record."
        confirmLabel="Revoke access"
        destructive
        onConfirm={() => {
          repository.revokeAssignment(item.id);
          setConfirmRevoke(false);
          setNotice("Access assignment revoked.");
          refresh((value) => value + 1);
        }}
      />
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${item.id}`}
        description="This removes the access assignment from the current workspace."
        confirmLabel="Delete assignment"
        destructive
        onConfirm={() => {
          repository.deleteAssignment(item.id);
          router.replace("/ops/cases/access");
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
