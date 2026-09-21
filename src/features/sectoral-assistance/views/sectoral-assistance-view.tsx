"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowRight, HandHeart, Inbox, ShieldCheck } from "lucide-react";

import {
  type OwnResidentProfile,
  readOwnResidentProfile,
} from "@/features/resident-household-registry/services/registry-selectors";
import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Timeline } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useDemoSession } from "@/shared/providers/demo-session-provider";
import { useOptionalWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localSectoralAssistanceRepository as repository } from "../services/local-sectoral-assistance-repository";

/** Public routes have no scenario switch; selecting one is a no-op there. */
function noopScenarioChange() {
  return undefined;
}

export type SectoralAssistanceScreen = "programs" | "apply" | "request" | "sector-detail" | "assessment";

const TITLES: Record<SectoralAssistanceScreen, [string, string]> = {
  programs: ["Assistance programs", "Compare sample benefits, recipient units, periods and evidence before starting."],
  apply: [
    "Apply for assistance",
    "Identify the subject and program while keeping sector status and aid eligibility separate.",
  ],
  request: ["Assistance request", "Track safe public progress, corrections and release information for this request."],
  "sector-detail": ["Sector status record", "Review dated validity, evidence source and renewal history."],
  assessment: [
    "Assistance decision workbench",
    "Compare overlaps, funding and acknowledgment before a sample release.",
  ],
};

const STAFF_SCREENS: readonly SectoralAssistanceScreen[] = ["sector-detail", "assessment"];

export function SectoralAssistanceView({ screen, recordId }: { screen: SectoralAssistanceScreen; recordId?: string }) {
  // Reachable from a public route as well as the operations shell. Outside
  // the workspace there is no persona and no scenario switch, so the public
  // surface reads as a non-staff role in the normal state.
  const workspace = useOptionalWorkspaceSession();
  const session = {
    role: workspace?.role ?? "partner",
    scenario: workspace?.scenario ?? "normal",
    setScenario: workspace?.setScenario ?? noopScenarioChange,
  };
  const [saved, setSaved] = useState<string>();
  const isStaff = STAFF_SCREENS.includes(screen);
  const permitted = session.role === "municipal" || session.role === "barangay";
  const [title, description] = TITLES[screen];

  if (isStaff && !permitted) {
    return (
      <PermissionState description="Choose the municipal or barangay demo role. Applicant and protected caseworker information is not exposed here." />
    );
  }
  if (session.scenario === "denied") {
    return (
      <PermissionState description="This selectable demo state hides assistance records for the current role and scope." />
    );
  }
  if (session.scenario === "error") {
    return <ErrorState onRetry={() => session.setScenario("normal")} />;
  }
  if (session.scenario === "empty") {
    return (
      <EmptyState
        icon={Inbox}
        title="No assistance records in this sample"
        description="Return the global preview state to normal to load programs and requests."
      />
    );
  }

  const request = repository.request(recordId ?? "DEMO-AID-001");
  const sector = repository.sectorRecord(recordId ?? "DEMO-SECTOR-001");

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        parent={isStaff ? "Operations" : "Services"}
        parentHref={isStaff ? "/ops" : "/services"}
      />
      {session.scenario === "slow" && (
        <NoticePanel className="mb-6">
          Slow-network preview: data may be stale; release remains disabled until review.
        </NoticePanel>
      )}
      {saved && <NoticePanel className="mb-6">{saved}</NoticePanel>}
      {screen === "programs" && <Programs />}
      {screen === "apply" && <Apply onSave={setSaved} />}
      {screen === "request" && (request ? <Request record={request} /> : <Unknown />)}
      {screen === "sector-detail" && (sector ? <SectorDetail record={sector} onSave={setSaved} /> : <Unknown />)}
      {screen === "assessment" && (request ? <Assessment record={request} onSave={setSaved} /> : <Unknown />)}
    </>
  );
}

function Programs() {
  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/assistance/requests/DEMO-AID-001">Track sample request</Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {repository.programs.map((program) => (
          <ContentPanel as="article" key={program.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="eyebrow">{program.id}</span>
                <h2 className="mt-1">{program.name}</h2>
              </div>
              <StatusBadge tone="neutral">{program.recipientUnit}</StatusBadge>
            </div>
            <p className="muted mt-3">
              {program.benefit} · {program.period}
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
              {program.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Button asChild className="mt-5 w-full sm:w-auto">
              <Link href={`/assistance/apply?program=${program.id}`}>
                Start sample request <ArrowRight />
              </Link>
            </Button>
          </ContentPanel>
        ))}
      </div>
    </>
  );
}

function Apply({ onSave }: { onSave: (message: string) => void }) {
  const { session, ready } = useDemoSession();
  const linkedPersonId =
    session?.residentAssociation?.status === "linked" ? session.residentAssociation.personId : undefined;
  const [resident, setResident] = useState<OwnResidentProfile>();
  const [residentLookupError, setResidentLookupError] = useState(false);
  const [programId, setProgramId] = useState(repository.programs[0].id);
  const [evidence, setEvidence] = useState("Needs assessment and barangay endorsement attached as M05 references.");
  const [evidenceChoice, setEvidenceChoice] = useState("attached");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!linkedPersonId) {
      setResident(undefined);
      return;
    }
    let active = true;
    void readOwnResidentProfile(linkedPersonId).then((result) => {
      if (!active) return;
      setResident(result.kind === "success" ? result.data : undefined);
      setResidentLookupError(result.kind !== "success");
    });
    return () => {
      active = false;
    };
  }, [linkedPersonId]);
  return (
    <ContentPanel>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 font-medium text-sm">
          Subject
          <Input
            readOnly
            value={resident ? `${resident.personId} · ${resident.displayName}` : "No linked resident record"}
          />
        </label>
        <label className="grid gap-2 font-medium text-sm">
          Program
          <NativeSelect className="w-full" value={programId} onChange={(event) => setProgramId(event.target.value)}>
            {repository.programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-2 font-medium text-sm md:col-span-2">
          Evidence note
          <Textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} />
        </label>
        <label className="grid gap-2 font-medium text-sm md:col-span-2">
          Local evidence selection
          <NativeSelect
            className="w-full"
            value={evidenceChoice}
            onChange={(event) => setEvidenceChoice(event.target.value)}
          >
            <option value="attached">Sample needs assessment attached locally</option>
            <option value="missing">Leave evidence missing for validation preview</option>
          </NativeSelect>
        </label>
      </div>
      <NoticePanel className="my-5">
        An age or expiry alert may open a review task. It never grants status or benefit automatically.
      </NoticePanel>
      {ready && !linkedPersonId && (
        <NoticePanel className="mb-5">
          Sign in with a linked resident account before submitting an assistance request.
        </NoticePanel>
      )}
      {residentLookupError && (
        <p className="mb-3 text-destructive text-sm" role="status">
          The linked resident record could not be loaded.
        </p>
      )}
      {resident && !resident.currentHouseholdId && (
        <p className="mb-3 text-destructive text-sm" role="status">
          The resident needs a current M01 household membership before applying.
        </p>
      )}
      {error && (
        <p className="mb-3 text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => onSave("Sample draft retained locally. No application was submitted.")}
        >
          Save local draft
        </Button>
        <Button
          onClick={() => {
            if (!resident?.currentHouseholdId) {
              setError("A linked resident and current household record are required.");
              return;
            }
            const created =
              evidenceChoice === "attached"
                ? repository.createRequest({
                    programId,
                    evidenceNote: evidence,
                    personId: resident.personId,
                    householdId: resident.currentHouseholdId,
                  })
                : undefined;
            if (!created) {
              setError("Choose a program and describe the evidence using at least eight characters.");
              return;
            }
            setError("");
            onSave(`${created.id} submitted to the local assessment queue.`);
          }}
        >
          Submit sample request
        </Button>
      </div>
    </ContentPanel>
  );
}

function Request({ record }: { record: NonNullable<ReturnType<typeof repository.request>> }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <ContentPanel>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <span className="eyebrow">{record.id}</span>
            <h2 className="mt-1">{record.programName}</h2>
          </div>
          <StatusBadge tone="pending">{record.status}</StatusBadge>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Fact label="Recipient" value={record.householdId} />
          <Fact label="Benefit period" value={record.period} />
          <Fact label="Requested" value={record.requestedValue} />
          <Fact label="M05 evidence" value={record.documentReference} />
          <Fact label="Evidence" value={record.evidence.join(" · ")} />
          {record.decisionReason && <Fact label="Decision reason" value={record.decisionReason} />}
          {record.releaseAcknowledgment && <Fact label="Release acknowledgment" value={record.releaseAcknowledgment} />}
        </dl>
      </ContentPanel>
      <ContentPanel>
        <h2>Safe progress</h2>
        <Timeline
          steps={[
            { title: "Request received", detail: "Subject and evidence references captured.", complete: true },
            {
              title: "Eligibility and overlap review",
              detail: record.overlap.explanation,
              complete: record.status !== "Under assessment",
            },
            {
              title: "Funding and release",
              detail: record.approvedValue ?? "No approved value yet.",
              complete: record.status === "Released",
            },
          ]}
        />
      </ContentPanel>
    </div>
  );
}

function SectorDetail({
  record,
  onSave,
}: {
  record: NonNullable<ReturnType<typeof repository.sectorRecord>>;
  onSave: (message: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ContentPanel>
        <ShieldCheck className="text-primary" />
        <h2 className="mt-3">{record.category} status</h2>
        <dl className="mt-5 grid gap-4">
          <Fact label="Person projection" value={`${record.personLabel} · ${record.personId}`} />
          <Fact label="Issuing authority" value={record.authority} />
          <Fact label="Validity" value={`${record.validFrom} → ${record.validTo}`} />
          <Fact label="Source provenance" value={record.source} />
          <Fact label="Evidence" value={record.evidence.join(" · ")} />
          <Fact label="Credential / booklet" value={record.credential} />
        </dl>
        <Button
          className="mt-5"
          variant="outline"
          onClick={() => {
            const renewal = repository.startRenewal(record.id);
            onSave(
              renewal
                ? `${renewal.id} opened for evidence review; the prior validity period remains unchanged.`
                : "Renewal could not be opened.",
            );
          }}
        >
          Start local renewal review
        </Button>
      </ContentPanel>
      <ContentPanel>
        <h2>History remains dated</h2>
        <Timeline
          steps={[
            { title: "Evidence reviewed", detail: "Local evidence set", complete: true },
            { title: record.status, detail: `Validity ends ${record.validTo}`, complete: true },
            {
              title: "Renewal",
              detail: "A new application creates another period; it does not overwrite this one.",
              complete: false,
            },
          ]}
        />
      </ContentPanel>
    </div>
  );
}

function Assessment({
  record,
  onSave,
}: {
  record: NonNullable<ReturnType<typeof repository.request>>;
  onSave: (message: string) => void;
}) {
  const [, refresh] = useState(0);
  const [reason, setReason] = useState("");
  const [acknowledgment, setAcknowledgment] = useState("");
  const decide = (decision: "exception" | "reject") => {
    if (!repository.decideDuplicate(record.id, decision, reason)) {
      onSave("Enter a decision reason using at least eight characters.");
      return;
    }
    onSave(
      decision === "exception"
        ? "Reasoned exception approved; the locked benefit is ready for release."
        : "Duplicate request denied with the comparison retained.",
    );
    refresh((value) => value + 1);
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <ContentPanel>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <span className="eyebrow">{record.id}</span>
            <h2 className="mt-1">Overlap and eligibility review</h2>
          </div>
          <StatusBadge tone="warning">{record.overlap.kind}</StatusBadge>
        </div>
        <p className="mt-4">{record.overlap.explanation}</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Fact label="Recipient unit" value={`${record.personId} / ${record.householdId}`} />
          <Fact label="Program and period" value={`${record.programId} · ${record.period}`} />
          <Fact label="Approved value" value={record.approvedValue ?? "Pending"} />
          <Fact label="Mock funding" value={record.fundingReference ?? "Not projected"} />
        </dl>
        <label className="mt-5 grid gap-2 font-medium text-sm">
          Decision reason
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Required for an exception or rejection"
          />
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button disabled={reason.trim().length < 8} onClick={() => decide("exception")}>
            Record exception
          </Button>
          <Button variant="outline" disabled={reason.trim().length < 8} onClick={() => decide("reject")}>
            Reject duplicate
          </Button>
        </div>
      </ContentPanel>
      <ContentPanel>
        <HandHeart className="text-primary" />
        <h2 className="mt-3">Release acknowledgment</h2>
        <p className="muted mt-2">Recipient, program, period and locked approved value stay together.</p>
        <dl className="mt-5 grid gap-4">
          <Fact label="Recipient" value={record.householdId} />
          <Fact label="Approved" value={record.approvedValue ?? "No approval"} />
          <Fact label="Fund source" value={record.fundingReference ?? "No projection"} />
        </dl>
        <label className="mt-5 grid gap-2 font-medium text-sm">
          Recipient acknowledgment
          <Input
            value={acknowledgment}
            onChange={(event) => setAcknowledgment(event.target.value)}
            placeholder="Manual or sample scan reference"
          />
        </label>
        <Button
          className="mt-5 w-full"
          disabled={record.status !== "Ready for release" || acknowledgment.trim().length < 6}
          onClick={() => {
            const result = repository.release(record.id, acknowledgment);
            onSave(
              result === "released"
                ? "One release event was added to the ledger."
                : result === "replayed"
                  ? "This release event already exists; no duplicate ledger row was added."
                  : "Release remains blocked by approval or acknowledgment requirements.",
            );
            refresh((value) => value + 1);
          }}
        >
          Record sample acknowledgment
        </Button>
      </ContentPanel>
    </div>
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
function Unknown() {
  return (
    <EmptyState
      icon={Inbox}
      title="Record unavailable"
      description="The reference is unknown or outside the current role scope."
    />
  );
}
