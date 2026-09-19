"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Building2, FileCheck2, Mail, MapPin, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";

import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { ApplicationTable } from "../components/application-table";
import { businessRepository as repository } from "../services/business-repository";
import type { BusinessApplicationRecord, BusinessRegistryStatus } from "../types/business-records";

const STATUS_TONE: Record<BusinessRegistryStatus, StatusTone> = {
  Active: "success",
  "Expiring soon": "warning",
  Expired: "destructive",
  Closed: "neutral",
};

export function BusinessRegistryDetailView({ businessId }: { businessId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const [, refresh] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [applicationDelete, setApplicationDelete] = useState<BusinessApplicationRecord>();
  const record = repository.readBusiness(businessId);

  if (role !== "municipal" && role !== "barangay")
    return (
      <PermissionState
        title="Business records are not assigned to this role"
        description="Choose the municipal or barangay staff role."
      />
    );
  if (!record)
    return (
      <PermissionState
        title="Business unavailable"
        description="The requested business was not found or was deleted."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/bpls/businesses">Back to businesses</Link>
          </Button>
        }
      />
    );
  const applications = repository.applicationsForBusiness(record.id);

  return (
    <>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">{record.id}</span>
          <h1>{record.tradeName}</h1>
          <p>{record.registeredName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/ops/bpls/businesses">
              <ArrowLeft />
              Back to businesses
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/ops/bpls/businesses/${record.id}/edit`}>
              <Pencil />
              Edit business
            </Link>
          </Button>
          <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <ContentPanel as="section">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Building2 className="text-primary" />
              <h2 className="mt-3">Business information</h2>
            </div>
            <StatusBadge tone={STATUS_TONE[record.status]}>{record.status}</StatusBadge>
          </div>
          <dl className="registry-facts mt-6">
            <Fact label="Organization type" value={record.organizationType} />
            <Fact label="Owner / organization" value={record.ownerName} />
            <Fact label="Taxpayer identification number" value={record.tin} />
            <Fact label="Primary activity" value={record.activity} />
            <Fact label="Employees" value={String(record.employeeCount)} icon={<Users size={14} />} />
            <Fact label="Last updated" value={record.updatedAt} />
          </dl>
        </ContentPanel>
        <ContentPanel as="aside">
          <MapPin className="text-primary" />
          <h2 className="mt-3">Establishment and permit</h2>
          <dl className="registry-facts mt-6">
            <Fact label="Barangay" value={record.barangay} />
            <Fact label="Address" value={record.address} />
            <Fact label="Permit number" value={record.permitNumber} />
            <Fact label="Permit valid until" value={record.permitValidUntil} />
          </dl>
          <PanelDivider />
          <div className="grid gap-3 text-sm">
            <p className="flex items-center gap-2">
              <Phone size={15} className="text-primary" />
              {record.contactNumber}
            </p>
            <p className="flex items-center gap-2">
              <Mail size={15} className="text-primary" />
              {record.email}
            </p>
          </div>
        </ContentPanel>
      </div>
      <div className="mt-6">
        <div className="ops-topline">
          <div>
            <h2>Permit applications</h2>
            <p>Applications and permit history connected to this business.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/ops/bpls/applications/new">
              <Plus />
              New application
            </Link>
          </Button>
        </div>
        {applications.length ? (
          <ApplicationTable records={applications} onDelete={setApplicationDelete} />
        ) : (
          <EmptyState
            icon={FileCheck2}
            title="No applications for this business."
            description="Create an application to begin permit processing."
          />
        )}
      </div>
      <ConfirmationDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${record.tradeName}`}
        description="This removes the business and all of its related permit applications from the current workspace."
        confirmLabel="Delete business"
        destructive
        onConfirm={() => {
          repository.deleteBusiness(record.id);
          router.replace("/ops/bpls/businesses");
        }}
      />
      <ConfirmationDialog
        open={applicationDelete !== undefined}
        onOpenChange={(next) => !next && setApplicationDelete(undefined)}
        title={`Delete ${applicationDelete?.id ?? "application"}`}
        description="This removes the selected permit application and its processing history."
        confirmLabel="Delete application"
        destructive
        onConfirm={() => {
          if (applicationDelete) repository.deleteApplication(applicationDelete.id);
          setApplicationDelete(undefined);
          refresh((value) => value + 1);
        }}
      />
    </>
  );
}

function Fact({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <dt className="muted flex items-center gap-1 font-semibold text-xs uppercase tracking-wide">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-medium text-sm">{value}</dd>
    </div>
  );
}
