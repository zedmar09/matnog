"use client";

import { type FormEvent, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Save } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { projectMonitoringRepository as repository } from "../services/project-monitoring-repository";
import { displayProjectReference } from "../services/project-presentation";

export function ProjectProgressFormView({ projectId }: { projectId: string }) {
  const { role } = useWorkspaceSession();
  const router = useRouter();
  const record = repository.find(projectId);
  const [physical, setPhysical] = useState(String(record?.physicalProgress ?? 0));
  const [financial, setFinancial] = useState(String(record?.financialProgress ?? 0));
  const [elapsed, setElapsed] = useState(String(record?.elapsedProgress ?? 0));
  const [end, setEnd] = useState(record?.currentEnd ?? "");
  const [error, setError] = useState("");
  if (role !== "municipal")
    return (
      <PermissionState
        title="Progress maintenance requires municipal access"
        description="Authorized municipal staff can update progress and delivery schedules."
      />
    );
  if (!record)
    return (
      <EmptyState
        icon={Save}
        headingLevel="h1"
        title="Project unavailable"
        description="The requested project could not be found."
      />
    );
  const reference = displayProjectReference(record.id);
  const resolvedProjectId = record.id;
  function submit(event: FormEvent) {
    event.preventDefault();
    const saved = repository.updateProgress(resolvedProjectId, {
      physicalProgress: Number(physical),
      financialProgress: Number(financial),
      elapsedProgress: Number(elapsed),
      currentEnd: end,
    });
    if (!saved) {
      setError("Progress values must be between 0 and 100, with a valid current completion date.");
      return;
    }
    router.push(`/ops/projects/${reference}/execution`);
  }
  return (
    <>
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href={`/ops/projects/${reference}/execution`}>
            <ArrowLeft size={15} /> Execution
          </Link>
          <h1>Update project progress</h1>
          <p>
            {reference} · {record.title}
          </p>
        </div>
      </div>
      <ContentPanel as="section">
        <form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}>
          <FormField id="physical-progress" label="Physical progress (%)" required>
            {(props) => (
              <Input
                {...props}
                type="number"
                min="0"
                max="100"
                value={physical}
                onChange={(event) => setPhysical(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="financial-progress" label="Financial progress (%)" required>
            {(props) => (
              <Input
                {...props}
                type="number"
                min="0"
                max="100"
                value={financial}
                onChange={(event) => setFinancial(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="elapsed-progress" label="Elapsed contract time (%)" required>
            {(props) => (
              <Input
                {...props}
                type="number"
                min="0"
                max="100"
                value={elapsed}
                onChange={(event) => setElapsed(event.target.value)}
              />
            )}
          </FormField>
          <FormField id="current-end" label="Current completion date" required>
            {(props) => <Input {...props} type="date" value={end} onChange={(event) => setEnd(event.target.value)} />}
          </FormField>
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm sm:col-span-2" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
            <Button asChild type="button" variant="outline">
              <Link href={`/ops/projects/${reference}/execution`}>Cancel</Link>
            </Button>
            <Button type="submit">
              <Save /> Save progress
            </Button>
          </div>
        </form>
      </ContentPanel>
    </>
  );
}
