"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  CornerUpRight,
  Pause,
  Play,
  RotateCcw,
  UserRoundPlus,
} from "lucide-react";

import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localServiceDeskRepository as repository } from "../services/local-service-desk-repository";
import type { QueueTicket } from "../types/service-desk";

const COUNTERS = ["Counter 1", "Counter 2", "Counter 3", "Counter 4"];

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function ServiceQueueView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => [...repository.tickets]);
  const activeTicket = records.find((ticket) => ticket.status === "Called");
  const queue = useMemo(
    () => records.filter((ticket) => ticket.status === "Waiting" || ticket.status === "Missed"),
    [records],
  );
  const [selectedId, setSelectedId] = useState(() => queue.at(0)?.id ?? "");
  const [transferCounter, setTransferCounter] = useState(activeTicket?.counter ?? "Counter 1");
  const [notice, setNotice] = useState("");
  const [serving, setServing] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(activeTicket ? 756 : 0);

  useEffect(() => {
    if (!serving || !activeTicket) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [activeTicket, serving]);

  function refresh(message: string) {
    const next = [...repository.tickets];
    setRecords(next);
    setNotice(message);
    const nextWaiting = next.find((ticket) => ticket.status === "Waiting");
    setSelectedId(nextWaiting?.id ?? "");
  }

  function callTicket(ticket: QueueTicket | undefined) {
    if (!ticket) {
      setNotice("Select a waiting ticket before calling.");
      return;
    }
    repository.transitionTicket(ticket.id, "Called");
    setServing(false);
    setElapsedSeconds(0);
    setTransferCounter(ticket.counter);
    refresh(`${ticket.number} is now being called to ${ticket.counter}.`);
  }

  function callNext() {
    const nextTicket = records.find((ticket) => ticket.status === "Waiting");
    if (!nextTicket) {
      setNotice("There are no waiting tickets in the queue.");
      return;
    }
    if (activeTicket) repository.transitionTicket(activeTicket.id, "Served");
    repository.transitionTicket(nextTicket.id, "Called");
    setServing(false);
    setElapsedSeconds(0);
    setTransferCounter(nextTicket.counter);
    refresh(`${nextTicket.number} is now being called to ${nextTicket.counter}.`);
  }

  function recall() {
    if (!activeTicket) return;
    setNotice(`${activeTicket.number} was recalled to ${activeTicket.counter}.`);
  }

  function transfer() {
    if (!activeTicket) return;
    repository.transferTicket(activeTicket.id, transferCounter);
    refresh(`${activeTicket.number} was transferred to ${transferCounter}.`);
  }

  function closeService() {
    if (!activeTicket) return;
    repository.transitionTicket(activeTicket.id, "Served");
    setServing(false);
    setElapsedSeconds(0);
    refresh(`${activeTicket.number} was completed.`);
  }

  if (role !== "municipal")
    return (
      <PermissionState
        title="Queue management requires municipal access"
        description="Counter queue operations are available to authorized municipal staff."
      />
    );

  const selectedTicket = queue.find((ticket) => ticket.id === selectedId);
  const servedCount = records.filter((ticket) => ticket.status === "Served").length;
  const missedCount = records.filter((ticket) => ticket.status === "Missed").length;

  return (
    <>
      <div className="ops-topline queue-page-heading">
        <div>
          <h1>Queue</h1>
          <p>Operate the service counter, call tickets, and monitor the waiting line.</p>
        </div>
        <div className="queue-counter-status">
          <span className={activeTicket ? "is-busy" : "is-open"} />
          {activeTicket ? `${activeTicket.counter} serving` : "Counter available"}
        </div>
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}

      <section className="service-queue-console" aria-label="Service counter console">
        <div className="queue-current-panel">
          <div className="queue-panel-heading">
            <span>Current serving</span>
            <StatusBadge tone={activeTicket ? "success" : "neutral"}>
              {activeTicket ? "Active" : "Available"}
            </StatusBadge>
          </div>

          <div className="queue-current-body">
            <span className="queue-current-label">Ticket number</span>
            <strong className="queue-current-number">{activeTicket?.number ?? "—"}</strong>
            <div className="queue-current-service">
              <strong>{activeTicket?.service ?? "No active service"}</strong>
              <span>{activeTicket?.counter ?? "Call the next ticket when ready"}</span>
            </div>
            <div className="queue-serving-clock">
              <Clock3 aria-hidden="true" />
              <div>
                <span>Serving time</span>
                <strong>{formatDuration(elapsedSeconds)}</strong>
              </div>
            </div>
          </div>

          <div className="queue-current-metrics">
            <div>
              <span>Total served</span>
              <strong>{servedCount}</strong>
            </div>
            <div>
              <span>Waiting tickets</span>
              <strong>{queue.filter((ticket) => ticket.status === "Waiting").length}</strong>
            </div>
            <div>
              <span>Counter status</span>
              <strong>{serving ? "Serving" : activeTicket ? "Called" : "Available"}</strong>
            </div>
          </div>
        </div>

        <fieldset className="queue-action-panel">
          <legend className="sr-only">Counter actions</legend>
          <Button
            className="queue-action-button"
            onClick={callNext}
            disabled={!queue.some((ticket) => ticket.status === "Waiting")}
          >
            <ArrowRight /> Next
          </Button>
          <Button
            className="queue-action-button"
            onClick={() => callTicket(selectedTicket)}
            disabled={Boolean(activeTicket) || !selectedTicket}
          >
            <BellRing /> Call
          </Button>
          <Button className="queue-action-button" onClick={recall} disabled={!activeTicket}>
            <RotateCcw /> Recall
          </Button>
          <div className="queue-transfer-control">
            <label htmlFor="queue-transfer-counter">Transfer to</label>
            <select
              id="queue-transfer-counter"
              value={transferCounter}
              onChange={(event) => setTransferCounter(event.target.value)}
              disabled={!activeTicket}
            >
              {COUNTERS.map((counter) => (
                <option key={counter}>{counter}</option>
              ))}
            </select>
            <Button className="queue-action-button" onClick={transfer} disabled={!activeTicket}>
              <CornerUpRight /> Transfer
            </Button>
          </div>
          <Button
            className="queue-action-button"
            onClick={() => setServing((value) => !value)}
            disabled={!activeTicket}
          >
            {serving ? <Pause /> : <Play />} {serving ? "Pause service" : "Start service"}
          </Button>
          <Button className="queue-action-button queue-action-close" onClick={closeService} disabled={!activeTicket}>
            <CheckCircle2 /> Close service
          </Button>
        </fieldset>

        <aside className="queue-waiting-panel">
          <div className="queue-waiting-heading">
            <div>
              <span>Waiting line</span>
              <strong>{queue.length} tickets</strong>
            </div>
            <span className="queue-live-indicator">Live</span>
          </div>

          <div className="queue-ticket-list">
            {queue.length ? (
              queue.map((ticket, index) => (
                <button
                  type="button"
                  className={cn("queue-ticket-item", ticket.id === selectedId && "is-selected")}
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                >
                  <span className="queue-ticket-order">{String(index + 1).padStart(2, "0")}</span>
                  <span className="queue-ticket-copy">
                    <strong>{ticket.number}</strong>
                    <small>{ticket.service}</small>
                    <span>{ticket.counter}</span>
                  </span>
                  <span className="queue-ticket-wait">
                    <strong>{ticket.status === "Missed" ? "Missed" : `${index * 6 + 4} min`}</strong>
                    <small>{ticket.status === "Missed" ? "recall available" : "estimated wait"}</small>
                  </span>
                </button>
              ))
            ) : (
              <div className="queue-empty-line">
                <CheckCircle2 />
                <strong>The waiting line is clear</strong>
                <span>New walk-in tickets will appear here.</span>
              </div>
            )}
          </div>

          <div className="queue-waiting-footer">
            <div>
              <span>Average wait</span>
              <strong>{queue.length ? "12 min" : "0 min"}</strong>
            </div>
            <div>
              <span>Missed</span>
              <strong>{missedCount}</strong>
            </div>
          </div>
          <Button asChild className="queue-add-visitor">
            <Link href="/ops/service-desk/queue/new">
              <UserRoundPlus /> Add walk-in
            </Link>
          </Button>
        </aside>
      </section>
    </>
  );
}
