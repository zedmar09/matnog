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

import { projectMonitoringRepository as repository } from "../services/project-monitoring-repository";
import { displayProjectReference, splitProjectTags } from "../services/project-presentation";

export function ProjectFormView({ projectId }: { projectId?: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = projectId ? repository.find(projectId) : undefined;
  const editing = Boolean(projectId);
  const [title, setTitle] = useState(record?.title ?? "");
  const [scope, setScope] = useState(record?.scope ?? "");
  const [barangay, setBarangay] = useState(record?.barangay ?? "");
  const [office, setOffice] = useState(record?.office ?? "Municipal Engineering Office");
  const [year, setYear] = useState(String(record?.year ?? 2027));
  const [type, setType] = useState(record?.type ?? "Infrastructure");
  const [tags, setTags] = useState(record?.tags.join(", ") ?? "");
  const [proposal, setProposal] = useState(record ? displayProjectReference(record.sourceProposal) : "");
  const [plan, setPlan] = useState(record ? displayProjectReference(record.sourcePlan) : "");
  const [appropriation, setAppropriation] = useState(
    record ? displayProjectReference(record.appropriationReference) : "",
  );
  const [allocation, setAllocation] = useState(record ? String(record.originalCostMinor / 100) : "");
  const [endDate, setEndDate] = useState(record?.originalEnd ?? "2027-12-31");
  const [error, setError] = useState("");

  if (role !== "municipal")
    return (
      <PermissionState
        title="Project maintenance requires municipal access"
        description="Authorized municipal staff can create and edit project records."
      />
    );
  if (editing && !record)
    return (
      <EmptyState
        icon={Plus}
        headingLevel="h1"
        title="Project unavailable"
        description="The requested project could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/projects">Back to projects</Link>
          </Button>
        }
      />
    );

  function submit(event: FormEvent) {
    event.preventDefault();
    const input = {
      title,
      scope,
      barangay,
      office,
      year: Number(year),
      type,
      tags: splitProjectTags(tags),
      sourceProposal: proposal,
      sourcePlan: plan,
      appropriationReference: appropriation,
      allocationPesos: Number(allocation),
      originalEnd: endDate,
    };
    const saved = record ? repository.updateProject(record.id, input) : repository.createProject(input);
    if (!saved) {
      setError(
        "Complete the project title, scope, barangay, office, source links, allocation, year, type, and target completion date.",
      );
      return;
    }
    router.push(`/ops/projects/${displayProjectReference(saved.id)}`);
  }

  return (
    <>
      <div className="ops-topline">
        <div>
          <Link
            className="ops-back-link"
            href={record ? `/ops/projects/${displayProjectReference(record.id)}` : "/ops/projects"}
          >
            <ArrowLeft size={15} /> Projects
          </Link>
          <h1>{record ? "Edit project" : "New project"}</h1>
          <p>Record the approved source, responsible office, location, scope, budget baseline, and delivery period.</p>
        </div>
      </div>
      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <FormField id="project-title" label="Project title" required>
            {(props) => <Input {...props} value={title} onChange={(event) => setTitle(event.target.value)} />}
          </FormField>
          <FormField id="project-barangay" label="Barangay" required>
            {(props) => <Input {...props} value={barangay} onChange={(event) => setBarangay(event.target.value)} />}
          </FormField>
          <label className="form-field sm:col-span-2">
            <span className="form-label">Project scope</span>
            <Textarea value={scope} onChange={(event) => setScope(event.target.value)} />
          </label>
          <FormField id="project-office" label="Responsible office" required>
            {(props) => <Input {...props} value={office} onChange={(event) => setOffice(event.target.value)} />}
          </FormField>
          <FormField id="project-type" label="Project type" required>
            {(props) => <Input {...props} value={type} onChange={(event) => setType(event.target.value)} />}
          </FormField>
          <FormField id="project-year" label="Project year" required>
            {(props) => (
              <Input
                {...props}
                type="number"
                min="2024"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="project-end" label="Target completion" required>
            {(props) => (
              <Input {...props} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            )}
          </FormField>
          <FormField id="project-proposal" label="Source proposal" required>
            {(props) => <Input {...props} value={proposal} onChange={(event) => setProposal(event.target.value)} />}
          </FormField>
          <FormField id="project-plan" label="Source plan" required>
            {(props) => <Input {...props} value={plan} onChange={(event) => setPlan(event.target.value)} />}
          </FormField>
          <FormField id="project-appropriation" label="Appropriation reference">
            {(props) => (
              <Input {...props} value={appropriation} onChange={(event) => setAppropriation(event.target.value)} />
            )}
          </FormField>
          <FormField id="project-allocation" label="Approved allocation (PHP)" required>
            {(props) => (
              <Input
                {...props}
                type="number"
                min="1"
                value={allocation}
                onChange={(event) => setAllocation(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="project-tags" label="Development tags" hint="Separate tags with commas">
            {(props) => <Input {...props} value={tags} onChange={(event) => setTags(event.target.value)} />}
          </FormField>
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link href={record ? `/ops/projects/${displayProjectReference(record.id)}` : "/ops/projects"}>
                Cancel
              </Link>
            </Button>
            <Button type="submit">
              {record ? <Save /> : <Plus />}
              {record ? "Save changes" : "Create project"}
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}
