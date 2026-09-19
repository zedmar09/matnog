"use client";

import { useState } from "react";

import Link from "next/link";

import { AlertTriangle, CalendarDays, Inbox, MapPinOff, MessagesSquare, TicketCheck } from "lucide-react";

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
import { useOptionalWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { localServiceDeskRepository as repository } from "../services/local-service-desk-repository";

export type ServiceDeskScreen = "intake" | "request" | "appointments" | "inbox" | "staff-detail" | "queue";
const META: Record<ServiceDeskScreen, [string, string]> = {
  intake: [
    "New service request",
    "Describe an ordinary request or concern with safe attachment and manual-location fallbacks.",
  ],
  request: ["Request progress", "Review safe status, public responses, feedback and reopening history."],
  appointments: ["Appointments", "Choose an accessible slot and keep reservations separate from counter service."],
  inbox: ["Service desk inbox", "Triage ordinary requests by assignment, urgency, due date and category."],
  "staff-detail": [
    "Assigned service request",
    "Manage ownership, internal notes, public response and an auditable closure proposal.",
  ],
  queue: ["Counter queue", "Call, recall, miss and serve ticket numbers without displaying requester names."],
};

export function ServiceDeskView({ screen, recordId }: { screen: ServiceDeskScreen; recordId?: string }) {
  // Public routes render this view outside the operations shell, where there is
  // no persona and no scenario switch. Those screens behave as the normal state.
  const session = useOptionalWorkspaceSession();
  const scenario = session?.scenario ?? "normal";
  const [preview, setPreview] = useState("normal");
  const [notice, setNotice] = useState<string>();
  const staff = ["inbox", "staff-detail", "queue"].includes(screen);
  if (staff && session?.role !== "municipal")
    return (
      <PermissionState description="Choose the municipal staff demo role. Internal ownership and response notes are not visible to public or unrelated roles." />
    );
  if (scenario === "denied")
    return (
      <PermissionState description="This selectable demo state hides the request or service-desk workspace for the current context." />
    );
  if (scenario === "error") return <ErrorState onRetry={() => session?.setScenario("normal")} />;
  if (scenario === "empty")
    return (
      <EmptyState
        icon={Inbox}
        title="No service-desk records"
        description="Return the global sample state to normal to view requests, slots and tickets."
      />
    );
  const [title, description] = META[screen];
  const request = repository.request(recordId ?? "DEMO-SVC-001");
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        parent={staff ? "Operations" : "Services"}
        parentHref={staff ? "/ops" : "/services"}
      />
      <NoticePanel className="mb-6">
        UI demo only. No SMS, live queue hardware, emergency dispatch, appointment service or external referral is
        called.
      </NoticePanel>
      {scenario === "slow" && (
        <NoticePanel className="mb-6">
          Slow-network preview: retain edits and recheck the current slot or request version before saving.
        </NoticePanel>
      )}
      {notice && <NoticePanel className="mb-6">{notice}</NoticePanel>}
      <ContentPanel className="mb-6">
        <label className="grid gap-2 font-medium text-sm">
          Exception preview
          <NativeSelect className="w-full" value={preview} onChange={(event) => setPreview(event.target.value)}>
            <option value="normal">Normal sample state</option>
            <option value="slot-conflict">Last-slot version conflict</option>
            <option value="no-slots">No available slots</option>
            <option value="no-owner">Unassigned and overdue</option>
            <option value="restricted">Protected complaint handoff</option>
            <option value="location">GPS / attachment unavailable</option>
            <option value="expired">Requester session expired</option>
          </NativeSelect>
        </label>
        {preview !== "normal" && (
          <NoticePanel className="mt-4" icon={<AlertTriangle aria-hidden="true" />}>
            {preview === "slot-conflict" &&
              "Another local attempt took the last slot. The 10:00 alternative remains selectable."}
            {preview === "no-slots" && "No sample slot matches this service and date. Request another date."}
            {preview === "no-owner" && "The request has no owner and is overdue; a supervisor assignment is required."}
            {preview === "restricted" &&
              "Protected details leave the ordinary inbox. Only a safe M10 referral state remains."}
            {preview === "location" &&
              "GPS or attachment access failed. Text and manual landmark remain in the local draft."}
            {preview === "expired" &&
              "Sign in again to view requester-specific status. The generic reference remains safe."}
          </NoticePanel>
        )}
      </ContentPanel>
      {screen === "intake" && <Intake preview={preview} onSave={setNotice} />}
      {screen === "request" &&
        (request && preview !== "expired" ? (
          <Request record={request} onSave={setNotice} />
        ) : preview === "expired" ? (
          <PermissionState description="The requester session expired. Sign in again before opening responses or feedback." />
        ) : (
          <Unknown />
        ))}
      {screen === "appointments" && <Appointments preview={preview} onSave={setNotice} />}
      {screen === "inbox" && <InboxView preview={preview} />}
      {screen === "staff-detail" &&
        (request ? <StaffDetail record={request} preview={preview} onSave={setNotice} /> : <Unknown />)}
      {screen === "queue" && <Queue preview={preview} onSave={setNotice} />}
    </>
  );
}

function Intake({ preview, onSave }: { preview: string; onSave: (value: string) => void }) {
  const [category, setCategory] = useState("ordinary");
  const [description, setDescription] = useState("Drainage obstruction near a public walkway.");
  const [location, setLocation] = useState("Beside the demo multipurpose hall");
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <ContentPanel>
        <div className="grid gap-4">
          <label className="grid gap-2 font-medium text-sm">
            Category
            <NativeSelect className="w-full" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="ordinary">Community concern</option>
              <option value="information">Public information request</option>
              <option value="protected">Protected concern</option>
            </NativeSelect>
          </label>
          <label className="grid gap-2 font-medium text-sm">
            Description
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="grid gap-2 font-medium text-sm">
            Location or landmark
            <Input value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>
        </div>
        <NoticePanel className="my-5">
          {category === "protected"
            ? "This category creates a restricted referral state; ordinary staff cannot read the details."
            : "This online form is not an emergency-dispatch channel."}
        </NoticePanel>
        <Button
          disabled={preview === "expired"}
          onClick={() => {
            const created = repository.createRequest({
              category: category as "ordinary" | "information" | "protected",
              description,
              location,
            });
            onSave(
              created
                ? `${created.id} created locally${created.status === "Restricted referral" ? "; ordinary details were removed from the inbox projection" : ""}. No notification was sent.`
                : "Describe the concern using at least twelve characters and provide a manual location.",
            );
          }}
        >
          Create sample request
        </Button>
      </ContentPanel>
      <ContentPanel>
        <MapPinOff className="text-primary" />
        <h2 className="mt-3">Evidence fallback</h2>
        <p className="muted mt-2">
          The request can keep a manual location and text description when media or GPS is unavailable.
        </p>
        <dl className="mt-5 grid gap-4">
          <Fact label="M05 evidence" value="Optional document reference" />
          <Fact label="M10 boundary" value="Protected categories route to a restricted desk" />
          <Fact label="M12 handoff" value="Recurring need only; no automatic project" />
        </dl>
      </ContentPanel>
    </div>
  );
}

function Request({
  record,
  onSave,
}: {
  record: NonNullable<ReturnType<typeof repository.request>>;
  onSave: (value: string) => void;
}) {
  const [, refresh] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <ContentPanel>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <span className="eyebrow">{record.id}</span>
            <h2 className="mt-1">{record.serviceName}</h2>
          </div>
          <StatusBadge tone="pending">{record.status}</StatusBadge>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Fact label="Category" value={record.category} />
          <Fact label="Next step / due" value={record.due} />
          <Fact label="Location" value={record.location} />
          <Fact label="Evidence" value={record.documentReference ?? "No public attachment"} />
        </dl>
        {record.publicResponse && <NoticePanel className="mt-5">{record.publicResponse}</NoticePanel>}
      </ContentPanel>
      <ContentPanel>
        <h2>Safe progress</h2>
        <Timeline
          steps={[
            { title: "Submitted", detail: "A reference was issued.", complete: true },
            { title: "Assigned", detail: record.owner, complete: record.status !== "Submitted" },
            {
              title: "Response and feedback",
              detail: record.publicResponse ?? "Waiting for a public response.",
              complete: ["Resolved pending feedback", "Reopened"].includes(record.status),
            },
          ]}
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <Input
            aria-label="Feedback"
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Feedback"
          />
          <Button
            variant="outline"
            disabled={feedback.trim().length < 5}
            onClick={() => {
              repository.feedback(record.id, feedback);
              onSave("Sample feedback saved locally; the prior public response remains in history.");
              refresh((value) => value + 1);
            }}
          >
            Send feedback
          </Button>
          <Input
            aria-label="Reopen reason"
            value={reopenReason}
            onChange={(event) => setReopenReason(event.target.value)}
            placeholder="Reason for dispute"
          />
          <Button
            disabled={reopenReason.trim().length < 8}
            onClick={() => {
              repository.reopen(record.id, reopenReason);
              onSave("Request reopened locally and a supervisor task was created.");
              refresh((value) => value + 1);
            }}
          >
            Dispute and reopen
          </Button>
        </div>
        <div className="mt-5 rounded-xl border p-4">
          <strong>Response and reopening history</strong>
          {record.history.map((item) => (
            <p className="muted mt-2 text-sm" key={item}>
              • {item}
            </p>
          ))}
        </div>
      </ContentPanel>
    </div>
  );
}

function Appointments({ preview, onSave }: { preview: string; onSave: (value: string) => void }) {
  const [, refresh] = useState(0);
  const slots = preview === "no-slots" ? [] : repository.slots;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <ContentPanel>
        <CalendarDays className="text-primary" />
        <h2 className="mt-3">Available sample slots</h2>
        {slots.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No slots available"
            description="Choose another sample date or service."
          />
        ) : (
          <div className="mt-4 grid gap-3">
            {slots.map((slot) => (
              <button
                type="button"
                onClick={() => {
                  const expectedVersion =
                    preview === "slot-conflict" && slot.remaining === 1 ? slot.version - 1 : slot.version;
                  const appointment = repository.book(slot.id, expectedVersion);
                  onSave(
                    appointment
                      ? `${appointment.id} booked for ${appointment.schedule}; one queue ticket was reserved.`
                      : "Slot version changed or capacity is unavailable. Choose another sample slot.",
                  );
                  refresh((value) => value + 1);
                }}
                className="rounded-xl border p-4 text-left hover:border-primary"
                key={slot.id}
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <strong>
                    {slot.date} · {slot.time}
                  </strong>
                  <StatusBadge tone={slot.remaining === 1 ? "warning" : "success"}>{slot.remaining} left</StatusBadge>
                </div>
                <p className="muted mt-2 text-sm">
                  {slot.service} · version {slot.version}
                </p>
              </button>
            ))}
          </div>
        )}
      </ContentPanel>
      <ContentPanel>
        <TicketCheck className="text-primary" />
        <h2 className="mt-3">Reservation history</h2>
        {repository.appointments.map((item) => (
          <div className="mt-4 rounded-xl border p-4" key={item.id}>
            <strong>{item.schedule}</strong>
            <p className="muted mt-2 text-sm">
              {item.service} · Ticket {item.ticket}
            </p>
            <StatusBadge className="mt-3">{item.status}</StatusBadge>
            {item.status === "Booked" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    repository.updateAppointment(item.id, "reschedule");
                    onSave(`${item.id} marked for rescheduling; choose a new slot.`);
                    refresh((value) => value + 1);
                  }}
                >
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    repository.updateAppointment(item.id, "cancel");
                    onSave(`${item.id} cancelled locally; service was not recorded.`);
                    refresh((value) => value + 1);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))}
        <NoticePanel className="mt-5">A reservation or ticket is not proof that the requester was served.</NoticePanel>
      </ContentPanel>
    </div>
  );
}

function InboxView({ preview }: { preview: string }) {
  const [category, setCategory] = useState("all");
  const [due, setDue] = useState("all");
  const ordinary = repository.requests.filter(
    (item) =>
      item.status !== "Restricted referral" &&
      (category === "all" || item.category === category) &&
      (due === "all" ||
        (due === "overdue" ? item.due.toLowerCase().includes("overdue") : !item.due.toLowerCase().includes("overdue"))),
  );
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
        <NativeSelect
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {[
            ...new Set(
              repository.requests.filter((item) => item.status !== "Restricted referral").map((item) => item.category),
            ),
          ].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filter by due state" value={due} onChange={(event) => setDue(event.target.value)}>
          <option value="all">All due states</option>
          <option value="current">Current</option>
          <option value="overdue">Overdue</option>
        </NativeSelect>
      </div>
      {ordinary.map((record) => (
        <ContentPanel key={record.id}>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <span className="eyebrow">
                {record.id} · {record.category}
              </span>
              <h2 className="mt-1">{record.serviceName}</h2>
              <p className="muted mt-2">
                {preview === "no-owner" ? "Unassigned" : record.owner} ·{" "}
                {preview === "no-owner" ? "Overdue" : record.due}
              </p>
            </div>
            <StatusBadge tone={record.status === "Reopened" ? "warning" : "pending"}>{record.status}</StatusBadge>
          </div>
          <Button asChild className="mt-5">
            <Link href={`/ops/service-desk/requests/${record.id}`}>Open assigned request</Link>
          </Button>
        </ContentPanel>
      ))}
    </div>
  );
}

function StaffDetail({
  record,
  preview,
  onSave,
}: {
  record: NonNullable<ReturnType<typeof repository.request>>;
  preview: string;
  onSave: (value: string) => void;
}) {
  const [, refresh] = useState(0);
  const [owner, setOwner] = useState(record.owner);
  const [publicResponse, setPublicResponse] = useState(record.publicResponse ?? "");
  const [internalNote, setInternalNote] = useState(record.internalProjection);
  const restricted = preview === "restricted" || record.status === "Restricted referral";
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
      <ContentPanel>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <span className="eyebrow">{record.id}</span>
            <h2 className="mt-1">{restricted ? "Restricted referral" : record.serviceName}</h2>
          </div>
          <StatusBadge tone={restricted ? "destructive" : "pending"}>
            {restricted ? "Transferred to M10" : record.status}
          </StatusBadge>
        </div>
        {restricted ? (
          <NoticePanel className="mt-5">
            Ordinary description, location and attachments are removed. Open the assigned M10 workspace under its own
            role and purpose checks.
          </NoticePanel>
        ) : (
          <>
            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Fact label="Owner" value={preview === "no-owner" ? "Unassigned" : record.owner} />
              <Fact label="Due" value={preview === "no-owner" ? "Overdue" : record.due} />
              <Fact label="Public description" value={record.description} />
              <Fact label="Internal projection" value={record.internalProjection} />
            </dl>
            <label className="mt-5 grid gap-2 font-medium text-sm">
              Assigned owner
              <Input value={owner} onChange={(event) => setOwner(event.target.value)} />
            </label>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => {
                const saved = repository.assign(record.id, owner);
                onSave(saved ? "Owner and sample due date updated." : "Name the assigned office before saving.");
                refresh((value) => value + 1);
              }}
            >
              Assign / reassign
            </Button>
            <label className="mt-5 grid gap-2 font-medium text-sm">
              Public response
              <Textarea
                value={publicResponse}
                onChange={(event) => setPublicResponse(event.target.value)}
                placeholder="Requester-safe response; internal notes stay separate"
              />
            </label>
            <label className="mt-4 grid gap-2 font-medium text-sm">
              Internal note
              <Textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} />
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                disabled={publicResponse.trim().length < 8}
                onClick={() => {
                  repository.respond(record.id, publicResponse, internalNote, false);
                  onSave("Public response saved; internal notes were not exposed.");
                  refresh((value) => value + 1);
                }}
              >
                Save public response
              </Button>
              <Button
                variant="outline"
                disabled={publicResponse.trim().length < 8}
                onClick={() => {
                  repository.respond(record.id, publicResponse, internalNote, true);
                  onSave("Closure proposed for requester feedback; history remains available.");
                  refresh((value) => value + 1);
                }}
              >
                Propose closure
              </Button>
            </div>
          </>
        )}
      </ContentPanel>
      <ContentPanel>
        <MessagesSquare className="text-primary" />
        <h2 className="mt-3">Cross-module handoffs</h2>
        <dl className="mt-5 grid gap-4">
          <Fact label="Protected concern" value="M10 safe referral state" />
          <Fact label="Recurring need" value="M12 proposal projection" />
          <Fact label="Approved content" value="M16 service-information source" />
          <Fact label="Notification" value="M17 local preview only" />
        </dl>
      </ContentPanel>
    </div>
  );
}

function Queue({ preview, onSave }: { preview: string; onSave: (value: string) => void }) {
  const [, refresh] = useState(0);
  const transition = (id: string, number: string, status: "Waiting" | "Called" | "Missed" | "Served") => {
    repository.transitionTicket(id, status);
    onSave(`${number} marked ${status.toLowerCase()}; appointment status remains separate.`);
    refresh((value) => value + 1);
  };
  return (
    <>
      <NoticePanel className="mb-6">
        The public board displays ticket numbers, counter and state only—never requester names or complaint details.
      </NoticePanel>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {repository.tickets.map((ticket) => (
          <ContentPanel key={ticket.id}>
            <span className="eyebrow">{ticket.counter}</span>
            <p className="mt-3 font-bold text-4xl">{ticket.number}</p>
            <p className="muted mt-2">{ticket.service}</p>
            <StatusBadge
              className="mt-4"
              tone={ticket.status === "Called" ? "success" : ticket.status === "Missed" ? "warning" : "neutral"}
            >
              {ticket.status}
            </StatusBadge>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={preview !== "normal"}
                onClick={() => transition(ticket.id, ticket.number, "Called")}
              >
                Call
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={preview !== "normal"}
                onClick={() => transition(ticket.id, ticket.number, "Served")}
              >
                Serve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={preview !== "normal"}
                onClick={() => transition(ticket.id, ticket.number, "Missed")}
              >
                Missed
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={preview !== "normal"}
                onClick={() => transition(ticket.id, ticket.number, "Called")}
              >
                Recall
              </Button>
            </div>
          </ContentPanel>
        ))}
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
function Unknown() {
  return (
    <EmptyState
      icon={Inbox}
      title="Request unavailable"
      description="The reference is unknown or outside the current requester or office scope."
    />
  );
}
