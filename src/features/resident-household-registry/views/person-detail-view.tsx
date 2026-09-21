"use client";
import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { ArrowLeft, FileText, History, Home, IdCard, MapPin, Waypoints } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PermissionState } from "@/shared/components/permission-state";
import { ScopeBadge } from "@/shared/components/scope-badge";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { formatDemoDateTime } from "@/shared/data/demo-clock";
import type { HistoryEntry } from "@/shared/data/record-envelope";
import type { RepositoryResult } from "@/shared/data/repository-result";
import { useDemoNow } from "@/shared/hooks/use-demo-clock";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { LifeEventPanel } from "../components/life-event-panel";
import { ResidencyTimeline } from "../components/residency-timeline";
import { ResidentServiceSummary } from "../components/resident-service-summary";
import { VerificationBadge } from "../components/verification-badge";
import { useRegistryActor } from "../hooks/use-registry-actor";
import { canEditRegistry } from "../services/registry-projections";
import { personHistory, readPerson } from "../services/registry-repository";
import { ageOn, fullName } from "../services/registry-rules";
import type { Person } from "../types/registry";

/** Residents have no photograph on file, so the avatar carries their initials. */
function initials(person: Person) {
  return `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase();
}

export function PersonDetailView({ personId }: { personId: string }) {
  const actor = useRegistryActor();
  const { scenario, generation } = useWorkspaceSession();
  const now = new Date(useDemoNow()).toISOString();
  const [result, setResult] = useState<RepositoryResult<Person> | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  // Controlled so the open tab survives a reload after a recorded change.
  const [tab, setTab] = useState("identity");

  const load = useCallback(() => {
    if (!actor) return;
    // Keep the current data on screen while refetching. Blanking it would
    // unmount the panels and discard the confirmation a reviewer just saw.
    void readPerson(actor, personId, scenario).then(setResult);
    void personHistory(actor, personId, scenario).then((entries) => {
      setHistory(entries.kind === "success" ? entries.data : []);
    });
  }, [actor, personId, scenario]);

  // A reset can leave the role (and therefore the actor) unchanged while the
  // fixtures and demo clock have been restored, so `generation` is carried as
  // an explicit refetch trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate refetch trigger.
  useEffect(load, [load, generation]);

  if (!actor) {
    return (
      <PermissionState
        title="The registry is not part of this workspace"
        description="The tourism partner role has no resident registry access."
        action={
          <Button asChild variant="outline">
            <Link href="/ops">Back to workspace overview</Link>
          </Button>
        }
      />
    );
  }

  if (result === null) return <LoadingState label="Loading resident record" message="Opening the resident record…" />;

  if (result.kind === "denied" || result.kind === "empty") {
    return (
      <PermissionState
        title={result.kind === "empty" ? "Record not available" : "This record is outside your scope"}
        description={
          result.kind === "empty" ? "No record matches this reference in your assigned scope." : result.message
        }
        action={
          <Button asChild variant="outline">
            <Link href="/ops/residents">Back to residents</Link>
          </Button>
        }
      />
    );
  }

  if (result.kind !== "success") return <ErrorState onRetry={load} />;

  const person = result.data;
  const openResidency = person.residency.find((period) => !period.to);
  const openMembership = person.memberships.find((membership) => !membership.to);

  return (
    <>
      <header className="profile-header">
        <span className="profile-avatar" aria-hidden="true">
          {initials(person)}
        </span>
        <div className="profile-identity">
          <div className="profile-name-row">
            <h1>{fullName(person)}</h1>
            <VerificationBadge state={person.verification.state} on={person.verification.verifiedAt} />
          </div>
          <p className="profile-contact">
            {person.envelope.id}
            {person.contactNumber ? ` · ${person.contactNumber}` : ""}
          </p>
          <p className="profile-meta">
            {openResidency ? `Resident since ${openResidency.from}` : "No open residency"}
            <span className="profile-status" data-tone={person.lifeStatus === "living" ? "on" : "off"}>
              {person.envelope.status}
            </span>
            {openResidency ? <ScopeBadge scope="barangay" value={openResidency.barangay.label} /> : null}
          </p>
        </div>
        <Button asChild variant="outline" className="profile-back">
          <Link href="/ops/residents">
            <ArrowLeft size={15} />
            Residents
          </Link>
        </Button>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="registry-tabs">
        <TabsList>
          <TabsTrigger value="identity">
            <IdCard size={15} />
            Identity
          </TabsTrigger>
          <TabsTrigger value="residency">
            <MapPin size={15} />
            Residency
          </TabsTrigger>
          <TabsTrigger value="household">
            <Home size={15} />
            Household
          </TabsTrigger>
          <TabsTrigger value="evidence">
            <FileText size={15} />
            Evidence
          </TabsTrigger>
          <TabsTrigger value="services">
            <Waypoints size={15} />
            Services
          </TabsTrigger>
          <TabsTrigger value="activity">
            <History size={15} />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <ContentPanel>
            <SectionHeading
              title="Identity"
              description="Names, aliases and demographic fields. A phone number is a contact detail, never proof of identity."
            />
            <dl className="registry-facts">
              <div>
                <dt>Full name</dt>
                <dd>{fullName(person)}</dd>
              </div>
              <div>
                <dt>Aliases</dt>
                <dd>{person.aliases.length > 0 ? person.aliases.join(", ") : "None recorded"}</dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>
                  {person.birthDate} · {ageOn(person, now)} years
                </dd>
              </div>
              <div>
                <dt>Sex</dt>
                <dd>{person.sex === "female" ? "Female" : "Male"}</dd>
              </div>
              <div>
                <dt>Civil status</dt>
                <dd>{person.civilStatus}</dd>
              </div>
              <div>
                <dt>Citizenship</dt>
                <dd>{person.citizenship}</dd>
              </div>
              <div>
                <dt>Occupation</dt>
                <dd>{person.occupation ?? "Not recorded"}</dd>
              </div>
              <div>
                <dt>Contact number</dt>
                <dd>{person.contactNumber ?? "Withheld in this projection"}</dd>
              </div>
              <div>
                <dt>Verification source</dt>
                <dd>{person.verification.source}</dd>
              </div>
            </dl>
          </ContentPanel>

          {canEditRegistry(actor) && <LifeEventPanel person={person} scenario={scenario} onDone={load} actor={actor} />}
        </TabsContent>

        <TabsContent value="residency">
          <ContentPanel>
            <SectionHeading
              title="Residency periods"
              description="Barangay belongs to a period, not to the person. A transfer closes one period and opens another; it never rewrites history."
            />
            <ResidencyTimeline periods={person.residency} />
          </ContentPanel>
        </TabsContent>

        <TabsContent value="household">
          <ContentPanel>
            <SectionHeading
              title="Household membership"
              description="Membership is a separate relationship from residency. A closed membership stays readable."
            />
            {person.memberships.length === 0 ? (
              <p className="muted">No household membership recorded.</p>
            ) : (
              <ul className="registry-memberships">
                {[...person.memberships]
                  .sort((a, b) => b.from.localeCompare(a.from))
                  .map((membership) => (
                    <li key={membership.id}>
                      <div>
                        <strong>{membership.householdId}</strong>
                        <p>
                          {membership.relationshipToHead} · {membership.from} – {membership.to ?? "present"}
                        </p>
                        {membership.temporaryAbsence && <small>Temporarily away: {membership.temporaryAbsence}</small>}
                      </div>
                      <div className="registry-membership-actions">
                        <StatusBadge tone={membership.to ? "neutral" : "success"}>
                          {membership.to ? "Closed" : "Current"}
                        </StatusBadge>
                        <Link className="text-link" href={`/ops/households/${membership.householdId}`}>
                          Open household
                        </Link>
                      </div>
                    </li>
                  ))}
              </ul>
            )}
            {openMembership && (
              <>
                <PanelDivider />
                <p className="small-note">
                  Household membership does not grant this person sight of other members&rsquo; restricted details.
                </p>
              </>
            )}
          </ContentPanel>
        </TabsContent>

        <TabsContent value="evidence">
          <ContentPanel>
            <SectionHeading
              title="Evidence"
              description="Attachment metadata only. Nothing is uploaded and no document here is valid for official use."
            />
            {person.evidence.length === 0 ? (
              <p className="muted">No evidence attached to this record.</p>
            ) : (
              <ul className="registry-evidence">
                {person.evidence.map((item) => (
                  <li key={item.id}>
                    <FileText size={20} />
                    <div>
                      <strong>{item.filename}</strong>
                      <small>
                        {item.mediaType} · revision {item.revision} · {Math.round(item.sizeBytes / 1024)} KB
                      </small>
                    </div>
                    <StatusBadge tone={item.state === "accepted" ? "success" : "pending"}>{item.state}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </ContentPanel>
        </TabsContent>

        <TabsContent value="services">
          <ResidentServiceSummary person={person} />
        </TabsContent>

        <TabsContent value="activity">
          <ContentPanel>
            <SectionHeading
              title="Activity"
              description="Every committed change records who acted, when, the resulting version and any reason given."
            />
            {history.length === 0 ? (
              <p className="muted">No recorded activity for this record.</p>
            ) : (
              <ol className="registry-history">
                {[...history].reverse().map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <strong>{entry.action}</strong>
                      <p>
                        {entry.actor} · {formatDemoDateTime(entry.at)} · version {entry.version}
                      </p>
                      {entry.reason && <small>Reason: {entry.reason}</small>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </ContentPanel>
        </TabsContent>
      </Tabs>

      <NoticePanel dot>
        Resident verification, municipal ID issuance and legal determinations are handled outside this record.
      </NoticePanel>
    </>
  );
}
