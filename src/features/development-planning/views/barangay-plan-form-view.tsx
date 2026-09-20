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

export function BarangayPlanFormView({ planId }: { planId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = planId ? repository.findBarangayPlan(planId) : undefined;
  const editing = Boolean(planId);
  const [title, setTitle] = useState(record?.title ?? "");
  const [barangay, setBarangay] = useState(record?.barangay ?? "");
  const [minutes, setMinutes] = useState(record?.councilMinutesReference ?? "");
  const [members, setMembers] = useState(record?.councilComposition.join("\n") ?? "");
  const [priorities, setPriorities] = useState(record?.priorities.join("\n") ?? "");
  const [status, setStatus] = useState(record?.status ?? "Draft");
  const [error, setError] = useState("");

  if (!role || !["municipal", "barangay"].includes(role))
    return (
      <PermissionState
        title="Planning access required"
        description="Authorized planning staff can maintain barangay plans."
      />
    );
  if (editing && !record)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Barangay plan unavailable"
        description="The requested plan could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/planning/barangay-plans">Back to barangay plans</Link>
          </Button>
        }
      />
    );

  function submit(event: FormEvent) {
    event.preventDefault();
    const input = {
      title,
      barangay,
      councilMinutesReference: minutes,
      councilComposition: splitLines(members),
      priorities: splitLines(priorities),
      status,
    };
    const saved = record ? repository.updateBarangayPlan(record.id, input) : repository.createBarangayPlan(input);
    if (!saved) {
      setError("Complete the title, barangay, council members, and at least one development priority.");
      return;
    }
    router.push(`/ops/planning/barangay-plans/${displayPlanningReference(saved.id)}`);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link
            className="ops-back-link"
            href={
              record
                ? `/ops/planning/barangay-plans/${displayPlanningReference(record.id)}`
                : "/ops/planning/barangay-plans"
            }
          >
            <ArrowLeft size={15} /> Barangay Plans
          </Link>
          <h1>{record ? "Edit barangay plan" : "New barangay plan"}</h1>
          <p>Record the council authority, development priorities, and submission status.</p>
        </div>
      </div>
      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <FormField id="plan-title" label="Plan title" required>
            {(props) => <Input {...props} value={title} onChange={(event) => setTitle(event.target.value)} />}
          </FormField>
          <FormField id="plan-barangay" label="Barangay" required>
            {(props) => <Input {...props} value={barangay} onChange={(event) => setBarangay(event.target.value)} />}
          </FormField>
          <FormField id="plan-minutes" label="BDC minutes reference">
            {(props) => <Input {...props} value={minutes} onChange={(event) => setMinutes(event.target.value)} />}
          </FormField>
          <label className="form-field">
            <span className="form-label">Status</span>
            <select
              className="h-10 rounded-lg border bg-background px-3"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option>Draft</option>
              <option>Submitted</option>
              <option>For correction</option>
              <option>Reviewed</option>
            </select>
          </label>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Council composition</span>
            <Textarea
              value={members}
              onChange={(event) => setMembers(event.target.value)}
              placeholder="Enter one member or sector per line"
            />
          </label>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Development priorities</span>
            <Textarea
              value={priorities}
              onChange={(event) => setPriorities(event.target.value)}
              placeholder="Enter one priority per line"
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
                href={
                  record
                    ? `/ops/planning/barangay-plans/${displayPlanningReference(record.id)}`
                    : "/ops/planning/barangay-plans"
                }
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
