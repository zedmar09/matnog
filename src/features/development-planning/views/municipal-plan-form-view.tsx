"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { developmentPlanningRepository as repository } from "../services/development-planning-repository";
import { displayPlanningReference, splitLines } from "../services/planning-presentation";
import type { MunicipalPlan } from "../types/development-planning";

export function MunicipalPlanFormView({ planId }: { planId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = planId ? repository.findPlan(planId) : undefined;
  const editing = Boolean(planId);
  const [level, setLevel] = useState<MunicipalPlan["level"]>(record?.level ?? "AIP");
  const [title, setTitle] = useState(record?.title ?? "");
  const [fiscalYears, setFiscalYears] = useState(record?.fiscalYears ?? "");
  const [version, setVersion] = useState(record?.version ?? "Version 1");
  const [parentReference, setParentReference] = useState(record?.parentReference ?? "");
  const [changeSummary, setChangeSummary] = useState(record?.changeSummary ?? "");
  const [approvalStatus, setApprovalStatus] = useState(record?.approvalStatus ?? "Draft");
  const [items, setItems] = useState(record?.itemReferences.join("\n") ?? "");
  const [error, setError] = useState("");
  if (role !== "municipal")
    return (
      <PermissionState
        title="Municipal planning access required"
        description="Authorized municipal planning staff can maintain these plans."
      />
    );
  if (editing && !record)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Municipal plan unavailable"
        description="The requested plan could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/planning/plans">Back to municipal plans</Link>
          </Button>
        }
      />
    );
  function submit(event: FormEvent) {
    event.preventDefault();
    const input = {
      level,
      title,
      fiscalYears,
      version,
      parentReference,
      changeSummary,
      approvalStatus,
      itemReferences: splitLines(items),
    };
    const saved = record ? repository.updatePlan(record.id, input) : repository.createPlan(input);
    if (!saved) {
      setError("Complete the title, fiscal period, version, and at least one proposal reference.");
      return;
    }
    router.push(`/ops/planning/plans/${displayPlanningReference(saved.id)}`);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link
            className="ops-back-link"
            href={record ? `/ops/planning/plans/${displayPlanningReference(record.id)}` : "/ops/planning/plans"}
          >
            <ArrowLeft size={15} /> Municipal Plans
          </Link>
          <h1>{record ? "Edit municipal plan" : "New municipal plan"}</h1>
          <p>Maintain the plan hierarchy, version record, covered period, and linked development proposals.</p>
        </div>
      </div>
      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <label className="form-field">
            <span className="form-label">Plan level</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={level}
              onChange={(event) => setLevel(event.target.value as MunicipalPlan["level"])}
            >
              <option>CDP</option>
              <option>LDIP</option>
              <option>AIP</option>
            </select>
          </label>
          <label className="form-field">
            <span className="form-label">Approval status</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={approvalStatus}
              onChange={(event) => setApprovalStatus(event.target.value)}
            >
              <option>Draft</option>
              <option>Under review</option>
              <option>Approved</option>
              <option>Deferred</option>
            </select>
          </label>
          <FormField id="municipal-plan-title" label="Plan title" required>
            {(props) => <Input {...props} value={title} onChange={(event) => setTitle(event.target.value)} />}
          </FormField>
          <FormField id="municipal-plan-years" label="Fiscal year or period" required>
            {(props) => (
              <Input {...props} value={fiscalYears} onChange={(event) => setFiscalYears(event.target.value)} />
            )}
          </FormField>
          <FormField id="municipal-plan-version" label="Version" required>
            {(props) => <Input {...props} value={version} onChange={(event) => setVersion(event.target.value)} />}
          </FormField>
          <FormField id="municipal-plan-parent" label="Parent plan reference">
            {(props) => (
              <Input {...props} value={parentReference} onChange={(event) => setParentReference(event.target.value)} />
            )}
          </FormField>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Version change summary</span>
            <Textarea value={changeSummary} onChange={(event) => setChangeSummary(event.target.value)} />
          </label>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Linked proposal references</span>
            <Textarea
              value={items}
              onChange={(event) => setItems(event.target.value)}
              placeholder="Enter one proposal reference per line"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link
                href={record ? `/ops/planning/plans/${displayPlanningReference(record.id)}` : "/ops/planning/plans"}
              >
                Cancel
              </Link>
            </Button>
            <Button type="submit">
              {record ? <Save /> : <Plus />}
              {record ? "Save changes" : "Create plan"}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}
