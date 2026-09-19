"use client";
import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, ArrowRight, CheckCheck, SearchX } from "lucide-react";

import { DataTable } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useDemoNow } from "@/shared/hooks/use-demo-clock";
import { formatStatusLabel } from "@/shared/lib/utils";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { DuplicateComparison } from "../components/duplicate-comparison";
import { TransferReviewPanel } from "../components/transfer-review-panel";
import { BARANGAYS } from "../data/barangays";
import { useRegistryActor } from "../hooks/use-registry-actor";
import { canAdjudicate } from "../services/registry-projections";
import { listDuplicates, listResidents, listTransfers } from "../services/registry-repository";
import { fullName } from "../services/registry-rules";
import {
  DUPLICATE_OUTCOMES,
  filterDuplicates,
  filterTransfers,
  SCORE_BANDS,
  TRANSFER_STATES,
} from "../services/review-filters";
import type { DuplicateCandidate, Person, TransferRequest } from "../types/registry";

const TRANSFER_TONE: Record<TransferRequest["state"], "success" | "pending" | "warning" | "neutral" | "destructive"> = {
  requested: "pending",
  released: "pending",
  accepted: "pending",
  completed: "success",
  rejected: "neutral",
  disputed: "destructive",
};

type State = {
  duplicates: DuplicateCandidate[] | null;
  duplicatesDenied: string | null;
  transfers: TransferRequest[] | null;
  transfersDenied: string | null;
  people: Person[];
  failed: boolean;
};

const EMPTY: State = {
  duplicates: null,
  duplicatesDenied: null,
  transfers: null,
  transfersDenied: null,
  people: [],
  failed: false,
};

export function RegistryReviewView() {
  const actor = useRegistryActor();
  const { scenario, generation } = useWorkspaceSession();
  const now = new Date(useDemoNow()).toISOString();
  const [state, setState] = useState<State>(EMPTY);
  const [loading, setLoading] = useState(true);
  // Controlled so the active queue survives a reload after a decision.
  const [tab, setTab] = useState("duplicates");
  // A queue shows the list until a row is opened; then it shows that record alone.
  const [openDuplicateId, setOpenDuplicateId] = useState<string>();
  const [openTransferId, setOpenTransferId] = useState<string>();
  const [duplicateSearch, setDuplicateSearch] = useState("");
  const [duplicateBand, setDuplicateBand] = useState("");
  const [duplicateOutcomeFilter, setDuplicateOutcomeFilter] = useState("");
  const [transferSearch, setTransferSearch] = useState("");
  const [transferState, setTransferState] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");

  function resetDuplicates() {
    setDuplicateSearch("");
    setDuplicateBand("");
    setDuplicateOutcomeFilter("");
  }

  function resetTransfers() {
    setTransferSearch("");
    setTransferState("");
    setTransferFrom("");
    setTransferTo("");
  }

  const openDuplicate = state.duplicates?.find((item) => item.envelope.id === openDuplicateId);
  const openTransfer = state.transfers?.find((item) => item.envelope.id === openTransferId);

  /** A person ID plus the name behind it, so a search on either one matches. */
  const nameOf = (personId: string) => {
    const person = state.people.find((item) => item.envelope.id === personId);
    return person ? fullName(person) : personId;
  };

  const duplicateRows = filterDuplicates(
    state.duplicates ?? [],
    { search: duplicateSearch, band: duplicateBand, outcome: duplicateOutcomeFilter },
    nameOf,
  );
  const transferRows = filterTransfers(
    state.transfers ?? [],
    { search: transferSearch, state: transferState, from: transferFrom, to: transferTo },
    nameOf,
  );

  const load = useCallback(async () => {
    if (!actor) return;
    setLoading(true);
    setState(EMPTY);
    const [duplicates, transfers, residents] = await Promise.all([
      listDuplicates(actor, scenario),
      listTransfers(actor, scenario),
      listResidents(actor, {}, scenario),
    ]);
    setState({
      duplicates: duplicates.kind === "success" ? duplicates.data : null,
      duplicatesDenied: duplicates.kind === "denied" ? duplicates.message : null,
      transfers: transfers.kind === "success" ? transfers.data : null,
      transfersDenied: transfers.kind === "denied" ? transfers.message : null,
      people: residents.kind === "success" ? residents.data.map((row) => row.person) : [],
      failed: duplicates.kind === "failure" || transfers.kind === "failure",
    });
    setLoading(false);
  }, [actor, scenario]);

  // A reset can leave the role (and therefore the actor) unchanged while the
  // fixtures and demo clock have been restored, so `generation` is carried as
  // an explicit refetch trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate refetch trigger.
  useEffect(() => {
    void load();
  }, [load, generation]);

  if (!actor) {
    return (
      <PermissionState
        title="The registry is not part of this workspace"
        description="The tourism partner role has no registry review access."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Back to workspace overview</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Review queues</h1>
          <p>
            Duplicate suggestions and barangay transfers. Every decision records who acted and why, and a merge can be
            reversed.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading review queues" message="Loading duplicate and transfer queues…" />
      ) : state.failed ? (
        <ErrorState onRetry={() => void load()} />
      ) : (
        <Tabs value={tab} onValueChange={setTab} className="registry-tabs">
          <TabsList>
            <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
          </TabsList>

          <TabsContent value="duplicates">
            {state.duplicatesDenied ? (
              <PermissionState title="Duplicate adjudication is restricted" description={state.duplicatesDenied} />
            ) : !state.duplicates || state.duplicates.length === 0 ? (
              <EmptyState
                icon={CheckCheck}
                title="No duplicate suggestions"
                description="Nothing is waiting for an identity decision in this scope."
              />
            ) : openDuplicate ? (
              <>
                <Button variant="outline" size="sm" className="mb-4" onClick={() => setOpenDuplicateId(undefined)}>
                  <ArrowLeft size={15} /> Back to the queue
                </Button>
                <DuplicateComparison
                  candidate={openDuplicate}
                  people={state.people}
                  actor={actor}
                  scenario={scenario}
                  now={now}
                  onDone={() => void load()}
                />
              </>
            ) : (
              <>
                <div className="ops-controls">
                  <OpsSearch
                    value={duplicateSearch}
                    onChange={setDuplicateSearch}
                    placeholder="Suggestion, person ID, or name…"
                  />
                  <OpsFilter
                    label="Match score"
                    value={duplicateBand}
                    onChange={setDuplicateBand}
                    anyLabel="Any score"
                    width={210}
                    options={SCORE_BANDS.map((band) => ({ value: band.value, label: band.label }))}
                  />
                  <OpsFilter
                    label="Outcome"
                    value={duplicateOutcomeFilter}
                    onChange={setDuplicateOutcomeFilter}
                    anyLabel="Any outcome"
                    width={210}
                    options={DUPLICATE_OUTCOMES}
                  />
                </div>
                {duplicateRows.length === 0 ? (
                  <EmptyState
                    icon={SearchX}
                    title="No duplicate suggestions match your filters."
                    description="Adjust the search or clear the filters."
                    action={
                      <Button variant="outline" onClick={resetDuplicates}>
                        Reset filters
                      </Button>
                    }
                  />
                ) : (
                  <DataTable
                    columns={[
                      {
                        key: "id",
                        header: "Suggestion",
                        sortValue: (row) => row.envelope.id,
                        cell: (row) => (
                          <button
                            type="button"
                            className="registry-queue-link"
                            onClick={() => setOpenDuplicateId(row.envelope.id)}
                          >
                            {row.envelope.id}
                          </button>
                        ),
                      },
                      {
                        key: "people",
                        header: "Records compared",
                        sortValue: (row) => nameOf(row.personIds[0]),
                        cell: (row) => (
                          <>
                            <strong>{row.personIds.map(nameOf).join(" · ")}</strong>
                            <small>{row.personIds.join(" · ")}</small>
                          </>
                        ),
                      },
                      {
                        key: "score",
                        header: "Match score",
                        className: "ops-numeric-cell",
                        sortValue: (row) => row.score,
                        cell: (row) => `${Math.round(row.score * 100)}%`,
                      },
                      {
                        key: "state",
                        header: "Status",
                        className: "ops-status-cell",
                        sortValue: (row) => row.envelope.status,
                        cell: (row) => (
                          <StatusBadge tone={row.decision ? "neutral" : "warning"}>{row.envelope.status}</StatusBadge>
                        ),
                      },
                      {
                        key: "open",
                        header: "Actions",
                        headerHidden: true,
                        cell: (row) => (
                          <button type="button" onClick={() => setOpenDuplicateId(row.envelope.id)}>
                            Review <ArrowRight size={14} />
                          </button>
                        ),
                      },
                    ]}
                    rows={duplicateRows}
                    getRowKey={(row) => row.envelope.id}
                    pageSize={12}
                    initialSort={{ key: "score", direction: "desc" }}
                    summary={`${duplicateRows.length} duplicate ${duplicateRows.length === 1 ? "suggestion" : "suggestions"}`}
                  />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="transfers">
            {state.transfersDenied ? (
              <PermissionState title="Transfer review is restricted" description={state.transfersDenied} />
            ) : !state.transfers || state.transfers.length === 0 ? (
              <EmptyState
                icon={CheckCheck}
                title="No transfer requests"
                description="No barangay transfer is waiting on your office."
              />
            ) : openTransfer ? (
              <>
                <Button variant="outline" size="sm" className="mb-4" onClick={() => setOpenTransferId(undefined)}>
                  <ArrowLeft size={15} /> Back to the queue
                </Button>
                <TransferReviewPanel
                  transfer={openTransfer}
                  actor={actor}
                  scenario={scenario}
                  onDone={() => void load()}
                />
              </>
            ) : (
              <>
                <div className="ops-controls">
                  <OpsSearch
                    value={transferSearch}
                    onChange={setTransferSearch}
                    placeholder="Request, person ID, name, or barangay…"
                  />
                  <OpsFilter
                    label="Stage"
                    value={transferState}
                    onChange={setTransferState}
                    anyLabel="Any stage"
                    options={TRANSFER_STATES.map((value) => ({ value, label: formatStatusLabel(value) }))}
                  />
                  <OpsFilter
                    label="From barangay"
                    value={transferFrom}
                    onChange={setTransferFrom}
                    anyLabel="Any origin"
                    width={210}
                    options={BARANGAYS.map((barangay) => ({ value: barangay.id, label: barangay.label }))}
                  />
                  <OpsFilter
                    label="To barangay"
                    value={transferTo}
                    onChange={setTransferTo}
                    anyLabel="Any destination"
                    width={210}
                    options={BARANGAYS.map((barangay) => ({ value: barangay.id, label: barangay.label }))}
                  />
                </div>
                {transferRows.length === 0 ? (
                  <EmptyState
                    icon={SearchX}
                    title="No transfer requests match your filters."
                    description="Adjust the search or clear the filters."
                    action={
                      <Button variant="outline" onClick={resetTransfers}>
                        Reset filters
                      </Button>
                    }
                  />
                ) : (
                  <DataTable
                    columns={[
                      {
                        key: "id",
                        header: "Request",
                        sortValue: (row) => row.envelope.id,
                        cell: (row) => (
                          <button
                            type="button"
                            className="registry-queue-link"
                            onClick={() => setOpenTransferId(row.envelope.id)}
                          >
                            {row.envelope.id}
                          </button>
                        ),
                      },
                      {
                        key: "person",
                        header: "Resident",
                        sortValue: (row) => nameOf(row.personId),
                        cell: (row) => (
                          <>
                            <strong>{nameOf(row.personId)}</strong>
                            <small>{row.personId}</small>
                          </>
                        ),
                      },
                      {
                        key: "route",
                        header: "From → to",
                        sortValue: (row) => row.from.label,
                        cell: (row) => `${row.from.label} → ${row.to.label}`,
                      },
                      {
                        key: "requested",
                        header: "Requested",
                        sortValue: (row) => row.requestedAt,
                        cell: (row) => row.requestedAt,
                      },
                      {
                        key: "state",
                        header: "Stage",
                        className: "ops-status-cell",
                        sortValue: (row) => row.state,
                        cell: (row) => (
                          <StatusBadge tone={TRANSFER_TONE[row.state]}>{formatStatusLabel(row.state)}</StatusBadge>
                        ),
                      },
                      {
                        key: "open",
                        header: "Actions",
                        headerHidden: true,
                        cell: (row) => (
                          <button type="button" onClick={() => setOpenTransferId(row.envelope.id)}>
                            Review <ArrowRight size={14} />
                          </button>
                        ),
                      },
                    ]}
                    rows={transferRows}
                    getRowKey={(row) => row.envelope.id}
                    pageSize={12}
                    initialSort={{ key: "requested", direction: "desc" }}
                    summary={`${transferRows.length} transfer ${transferRows.length === 1 ? "request" : "requests"}`}
                  />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!canAdjudicate(actor) && (
        <NoticePanel dot>
          Your demo role can act on transfers that involve your barangay. Duplicate adjudication belongs to the
          municipal data steward.
        </NoticePanel>
      )}
    </>
  );
}
