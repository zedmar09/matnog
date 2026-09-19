"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, CalendarDays, HandHeart, Pencil, Trash2 } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localSectoralAssistanceRepository as repository } from "../services/local-sectoral-assistance-repository";
import type { BenefitLedgerStatus } from "../types/sectoral-assistance";

const TONE: Record<BenefitLedgerStatus, StatusTone> = {
  Released: "success",
  "Pending confirmation": "pending",
  Cancelled: "neutral",
};

export function LedgerDetailView({ entryId }: { entryId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const entry = repository.ledgerEntry(entryId);

  if (role !== "municipal" && role !== "barangay") {
    return (
      <PermissionState
        title="The assistance ledger is not assigned to this role"
        description="Choose the municipal or barangay role."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/assistance/ledger">Back to ledger</Link>
          </Button>
        }
      />
    );
  }

  if (!entry) {
    return (
      <PermissionState
        title="Ledger entry unavailable"
        description="That local ledger reference was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/assistance/ledger">Back to ledger</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">Assistance</span>
          <h1>{entry.id}</h1>
          <p>{entry.program}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/assistance/ledger">
              <ArrowLeft />
              Back to ledger
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/assistance/ledger/${entry.id}/edit`}>
              <Pencil />
              Edit entry
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
              <span className="eyebrow">Recipient and benefit</span>
              <h2 className="mt-1">{entry.recipientName}</h2>
            </div>
            <StatusBadge tone={TONE[entry.status]}>{entry.status}</StatusBadge>
          </div>
          <dl className="registry-facts mt-6">
            <Fact label="Recipient reference" value={entry.recipient} />
            <Fact label="Assistance request" value={entry.requestId} />
            <Fact label="Program" value={entry.program} />
            <Fact label="Benefit period" value={entry.period} />
            <Fact label="Benefit / released value" value={entry.value} />
            <Fact label="Fund source" value={entry.fundSource} />
          </dl>
        </ContentPanel>

        <ContentPanel as="aside">
          <HandHeart className="text-primary" />
          <h2 className="mt-3">Release record</h2>
          <p className="muted">The acknowledgment and release time remain attached to this ledger entry.</p>
          <PanelDivider />
          <dl className="grid gap-5">
            <Fact label="Acknowledgment" value={entry.acknowledgment} />
            <Fact label="Released at" value={entry.releasedAt} />
            <Fact label="Current status" value={entry.status} />
          </dl>
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">
            <CalendarDays size={17} className="text-primary" aria-hidden="true" />
            Recorded for {entry.period}
          </div>
        </ContentPanel>
      </div>

      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${entry.id}`}
        description="This removes the entry from the local UI demo. The beneficiary and assistance request remain available."
        confirmLabel="Delete entry"
        destructive
        onConfirm={() => {
          repository.deleteLedgerEntry(entry.id);
          router.replace("/ops/assistance/ledger");
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
