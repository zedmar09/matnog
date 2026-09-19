"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { CalendarCheck2, CalendarClock, CalendarX2, CheckCircle2, EllipsisVertical, Plus, SearchX } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ServiceDeskSummaryCards } from "../components/service-desk-summary-cards";
import { localServiceDeskRepository as repository } from "../services/local-service-desk-repository";
import type { Appointment } from "../types/service-desk";

function displayReference(id: string) {
  return id.replace(/^DEMO-/, "");
}

export function ServiceAppointmentListView() {
  const { role } = useWorkspaceSession();
  const [records, setRecords] = useState(() => [...repository.appointments]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return records.filter(
      (record) =>
        (!status || record.status === status) &&
        (!normalized ||
          `${record.id} ${record.requester} ${record.service} ${record.ticket} ${record.contact}`
            .toLocaleLowerCase()
            .includes(normalized)),
    );
  }, [query, records, status]);
  const totals = records.reduce(
    (sum, record) => ({
      booked: sum.booked + (record.status === "Booked" ? 1 : 0),
      rescheduled: sum.rescheduled + (record.status === "Rescheduled" ? 1 : 0),
      cancelled: sum.cancelled + (record.status === "Cancelled" ? 1 : 0),
    }),
    { booked: 0, rescheduled: 0, cancelled: 0 },
  );

  function update(id: string, action: "reschedule" | "cancel") {
    const saved = repository.updateAppointment(id, action);
    if (!saved) {
      setNotice("The appointment could not be updated.");
      return;
    }
    setRecords([...repository.appointments]);
    setNotice(`${displayReference(id)} was ${action === "cancel" ? "cancelled" : "marked for rescheduling"}.`);
  }

  const columns: DataTableColumn<Appointment>[] = [
    {
      key: "reference",
      header: "Appointment",
      sortValue: (row) => row.createdAt,
      cell: (row) => (
        <>
          <strong>{displayReference(row.id)}</strong>
          <small>Ticket {row.ticket}</small>
        </>
      ),
    },
    {
      key: "requester",
      header: "Requester",
      className: "ops-wide-cell",
      sortValue: (row) => row.requester,
      cell: (row) => (
        <>
          <strong>{row.requester}</strong>
          <small>{row.contact}</small>
        </>
      ),
    },
    {
      key: "service",
      header: "Service",
      className: "ops-wide-cell",
      sortValue: (row) => row.service,
      cell: (row) => (
        <>
          <strong>{row.service}</strong>
          <small>Booked {formatDemoDateTime(row.createdAt)}</small>
        </>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      sortValue: (row) => row.schedule,
      cell: (row) => <strong>{row.schedule}</strong>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (row) => row.status,
      cell: (row) => (
        <StatusBadge
          tone={row.status === "Booked" ? "success" : row.status === "Cancelled" ? "destructive" : "warning"}
        >
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerHidden: true,
      cell: (row) =>
        row.status === "Booked" ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="ops-row-menu" aria-label={`Actions for ${displayReference(row.id)}`}>
              <EllipsisVertical size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="ops-row-menu-content">
              <DropdownMenuItem onSelect={() => update(row.id, "reschedule")}>Reschedule appointment</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => update(row.id, "cancel")}>Cancel appointment</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-muted-foreground" title="No available actions">
            —
          </span>
        ),
    },
  ];
  if (role !== "municipal")
    return (
      <PermissionState
        title="Appointments require municipal access"
        description="Appointment records are available to authorized municipal staff."
      />
    );
  const filtering = Boolean(query || status);
  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Appointments</h1>
          <p>Manage scheduled visits, requester contact details, service assignments, and ticket references.</p>
        </div>
        <Button asChild>
          <Link href="/ops/service-desk/appointments/new">
            <Plus /> New appointment
          </Link>
        </Button>
      </div>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <ServiceDeskSummaryCards
        label="Appointment totals"
        items={[
          { label: "All appointments", value: records.length, detail: "records", icon: CalendarCheck2 },
          { label: "Booked", value: totals.booked, detail: "upcoming", icon: CheckCircle2 },
          { label: "Rescheduled", value: totals.rescheduled, detail: "requires new slot", icon: CalendarClock },
          { label: "Cancelled", value: totals.cancelled, detail: "closed", icon: CalendarX2 },
        ]}
      />
      <div className="ops-controls">
        <OpsSearch value={query} onChange={setQuery} placeholder="Appointment, requester, service, or ticket…" />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={[
            { value: "Booked", label: "Booked" },
            { value: "Rescheduled", label: "Rescheduled" },
            { value: "Cancelled", label: "Cancelled" },
          ]}
        />
      </div>
      {rows.length ? (
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          initialSort={{ key: "reference", direction: "desc" }}
          summary={`${rows.length} appointment records`}
        />
      ) : (
        <EmptyState
          icon={SearchX}
          title={filtering ? "No appointments match these filters" : "No appointments recorded"}
          description={filtering ? "Change the search or status filter." : "Scheduled visits will appear here."}
        />
      )}
    </>
  );
}
