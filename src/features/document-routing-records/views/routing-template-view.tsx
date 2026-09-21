"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus, SearchX, Workflow } from "lucide-react";

import { RoutingTemplateTable } from "@/features/document-routing-records/components/routing-template-table";
import { ConfirmationDialog } from "@/shared/components/confirmation-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { OpsFilter, OpsSearch } from "@/shared/components/ops-filter";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { routingTemplateRepository } from "../services/routing-template-repository";
import type { RoutingTemplate } from "../types/document-routing";

export function RoutingTemplateView() {
  const router = useRouter();
  const { role } = useWorkspaceSession();
  const [templates, setTemplates] = useState(() => routingTemplateRepository.list());
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [pendingDelete, setPendingDelete] = useState<RoutingTemplate>();
  const [notice, setNotice] = useState("");

  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return templates.filter((template) => {
      const haystack = `${template.name} ${template.id}`.toLocaleLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (!mode || template.mode === mode) &&
        (!status || template.status === status)
      );
    });
  }, [mode, search, status, templates]);

  if (role !== "municipal") {
    return (
      <PermissionState
        title="Routing templates are limited to municipal administrators"
        description="Barangay, partner, and Field Surveyor roles can use assigned tasks but cannot change routing configuration."
      />
    );
  }

  function createTemplate() {
    const created = routingTemplateRepository.create();
    router.push(`/ops/routing/templates/${created.id}`);
  }

  function deleteTemplate() {
    if (!pendingDelete) return;
    routingTemplateRepository.delete(pendingDelete.id);
    setTemplates(routingTemplateRepository.list());
    setNotice(`${pendingDelete.name} was deleted.`);
    setPendingDelete(undefined);
  }

  const filtering = Boolean(search || mode || status);

  return (
    <>
      <div className="ops-topline">
        <div>
          <h1>Routing templates</h1>
          <p>Manage reusable document routes, office assignments, target days, and receipt requirements.</p>
        </div>
        <Button onClick={createTemplate}>
          <Plus />
          New template
        </Button>
      </div>

      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}

      <div className="ops-controls">
        <OpsSearch value={search} onChange={setSearch} placeholder="Template name or reference…" />
        <OpsFilter
          label="Routing mode"
          value={mode}
          onChange={setMode}
          anyLabel="Any mode"
          options={[
            { value: "sequential", label: "Sequential" },
            { value: "parallel", label: "Parallel" },
          ]}
        />
        <OpsFilter
          label="Status"
          value={status}
          onChange={setStatus}
          anyLabel="Any status"
          options={[
            { value: "active", label: "Active" },
            { value: "draft", label: "Draft" },
          ]}
        />
      </div>

      {rows.length ? (
        <RoutingTemplateTable records={rows} onDelete={setPendingDelete} />
      ) : (
        <EmptyState
          icon={filtering ? SearchX : Workflow}
          title={filtering ? "No templates match your filters." : "No routing templates are available."}
          description={
            filtering
              ? "Adjust the search or clear the filters."
              : "Create a routing template to define the offices and staff responsible for a document."
          }
          action={
            filtering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setMode("");
                  setStatus("");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button onClick={createTemplate}>
                <Plus />
                New template
              </Button>
            )
          }
        />
      )}

      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(undefined)}
        title={`Delete ${pendingDelete?.name ?? "routing template"}`}
        description="This removes the routing template. Existing document routes retain their recorded stages and assignments."
        confirmLabel="Delete template"
        destructive
        onConfirm={deleteTemplate}
      />
    </>
  );
}
