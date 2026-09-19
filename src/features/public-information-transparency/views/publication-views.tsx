"use client";

import { type ReactNode, useState } from "react";

import Link from "next/link";

import { AlertTriangle, Archive, Building2, FileQuestion, FolderOpen, Send, ShieldCheck } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { PermissionState } from "@/shared/components/permission-state";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useOptionalWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { FeaturedPublication, PublicationCard, PublicationGrid, SectionRule } from "../components/publication-cards";
import { DISCLOSURE_DOCUMENTS, OFFICE_DIRECTORY } from "../data/publication-fixtures";
import { publicationRepository } from "../services/publication-repository";

/** Public routes have no scenario switch; selecting one is a no-op there. */
function noopScenarioChange() {
  return undefined;
}

export function OfficesView() {
  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Home"
        parentHref="/"
        title="Municipal office directory"
        description="Service responsibilities, office hours and contact details for each municipal office."
      />
      <NoticePanel className="mb-6">
        Office names describe planned service ownership. Officials, phone numbers, email addresses and service hours
        require LGU confirmation.
      </NoticePanel>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {OFFICE_DIRECTORY.map((office) => (
          <ContentPanel as="article" key={office.id}>
            <Building2 className="text-primary" />
            <span className="eyebrow mt-4 block">{office.id}</span>
            <h2 className="mt-1 text-base">{office.name}</h2>
            <p className="muted mt-3">{office.services}</p>
            <PanelDivider />
            <p className="text-sm">{office.official}</p>
            <p className="text-sm">{office.hours}</p>
            <p className="muted mt-2 text-sm">{office.contact}</p>
          </ContentPanel>
        ))}
      </div>
    </div>
  );
}

export function AdvisoriesView() {
  const [archive, setArchive] = useState(false);
  const [office, setOffice] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const baseItems = archive ? publicationRepository.archivedAdvisories() : publicationRepository.listPublic("advisory");
  const offices = [...new Set(baseItems.map((item) => item.issuingOffice))];
  const items = baseItems.filter(
    (item) => (office === "all" || item.issuingOffice === office) && (!dateFilter || item.issueDate === dateFilter),
  );
  const [featured, ...rest] = items;
  const filtered = office !== "all" || dateFilter !== "";

  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Home"
        parentHref="/"
        title="Municipal advisories"
        description="Notices from the municipal offices, with the issuing office, issue date and correction state."
      />

      <div className="pub-filters">
        <div className="pub-filter-row">
          <fieldset className="pub-segment">
            <legend className="sr-only">Advisory set</legend>
            <button type="button" data-state={archive ? "off" : "on"} onClick={() => setArchive(false)}>
              Current
            </button>
            <button type="button" data-state={archive ? "on" : "off"} onClick={() => setArchive(true)}>
              Archived
            </button>
          </fieldset>
          <label className="pub-date">
            <span>Issue date</span>
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </label>
          {filtered ? (
            <button
              type="button"
              className="pub-clear"
              onClick={() => {
                setOffice("all");
                setDateFilter("");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <fieldset className="pub-filter-group">
          <legend className="pub-filter-label">Issuing office</legend>
          <div className="pub-chip-filter">
            <button type="button" data-state={office === "all" ? "on" : "off"} onClick={() => setOffice("all")}>
              All offices
            </button>
            {offices.map((name) => (
              <button
                key={name}
                type="button"
                data-state={office === name ? "on" : "off"}
                onClick={() => setOffice(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No advisories match"
          description="Choose another filter to see the advisories on record."
        />
      ) : (
        <>
          {featured ? (
            <FeaturedPublication
              item={{ ...featured, status: featured.status, href: `/advisories/${featured.id}` }}
              action="Read advisory"
            />
          ) : null}
          {rest.length ? (
            <>
              <SectionRule title="More advisories" />
              <PublicationGrid>
                {rest.map((item) => (
                  <PublicationCard
                    key={item.id}
                    item={{ ...item, status: item.status, href: `/advisories/${item.id}` }}
                  />
                ))}
              </PublicationGrid>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

export function ProjectsView() {
  const [query, setQuery] = useState("");
  const [office, setOffice] = useState("all");

  const all = publicationRepository.listPublic("project");
  const offices = [...new Set(all.map((item) => item.issuingOffice))];
  const projects = all.filter(
    (item) =>
      (office === "all" || item.issuingOffice === office) &&
      `${item.title} ${item.summary} ${item.sourceReference}`.toLowerCase().includes(query.toLowerCase()),
  );
  const [featured, ...rest] = projects;

  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Home"
        parentHref="/"
        title="Municipal projects"
        description="Project progress, approved budget and target completion, published by the responsible office."
      />

      <div className="pub-filters">
        <div className="pub-filter-row">
          <Input
            className="pub-search"
            placeholder="Search projects"
            aria-label="Search projects"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query || office !== "all" ? (
            <button
              type="button"
              className="pub-clear"
              onClick={() => {
                setQuery("");
                setOffice("all");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
        <fieldset className="pub-filter-group">
          <legend className="pub-filter-label">Implementing office</legend>
          <div className="pub-chip-filter">
            <button type="button" data-state={office === "all" ? "on" : "off"} onClick={() => setOffice("all")}>
              All offices
            </button>
            {offices.map((name) => (
              <button
                key={name}
                type="button"
                data-state={office === name ? "on" : "off"}
                onClick={() => setOffice(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No project matches"
          description="Clear the search to return to the published projects."
        />
      ) : (
        <>
          {featured ? (
            <FeaturedPublication
              item={{ ...featured, href: `/projects/${featured.sourceReference}` }}
              action="Read project summary"
            />
          ) : null}
          {rest.length ? (
            <>
              <SectionRule title="More projects" />
              <PublicationGrid>
                {rest.map((item) => (
                  <PublicationCard key={item.id} item={{ ...item, href: `/projects/${item.sourceReference}` }} />
                ))}
              </PublicationGrid>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

export function AdvisoryDetailView({ advisoryId }: { advisoryId: string }) {
  const item = publicationRepository.findAdvisory(advisoryId);
  if (!item)
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={FileQuestion}
          headingLevel="h1"
          title="Advisory unavailable"
          description="The advisory was not found, or it is not published."
          action={
            <Button asChild>
              <Link href="/advisories">Return to advisories</Link>
            </Button>
          }
        />
      </div>
    );
  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Advisories"
        parentHref="/advisories"
        title={item.title}
        description={`Issued ${item.issueDate} by the ${item.issuingOffice}`}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
        <ContentPanel as="article">
          <p className="text-base">{item.summary}</p>
          <p className="mt-4">{item.body}</p>
          {item.correctionNote && (
            <p className="mt-5 rounded-lg bg-muted p-3 text-sm">
              <strong>Correction:</strong> {item.correctionNote}
            </p>
          )}
          <PanelDivider />
          <dl className="registry-facts">
            {item.publicFields.map((field) => (
              <div key={field}>
                <dt>Published detail</dt>
                <dd>{field}</dd>
              </div>
            ))}
          </dl>
        </ContentPanel>
        <ContentPanel as="aside">
          <Building2 className="text-primary" />
          <h2 className="mt-3">Issuing office</h2>
          <p className="muted mt-2">{item.issuingOffice}</p>
          <PanelDivider />
          <dl className="registry-facts">
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge tone={item.status === "archived" ? "neutral" : "success"}>{item.status}</StatusBadge>
              </dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>{item.issueDate}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{item.updatedDate}</dd>
            </div>
            {item.effectiveUntil ? (
              <div>
                <dt>In effect until</dt>
                <dd>{item.effectiveUntil}</dd>
              </div>
            ) : null}
          </dl>
        </ContentPanel>
      </div>
    </div>
  );
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const item = publicationRepository.findPublicProject(projectId);
  if (!item)
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={FileQuestion}
          headingLevel="h1"
          title="Published project unavailable"
          description="The project has no approved public snapshot or the reference was not found."
          action={
            <Button asChild>
              <Link href="/projects">Return to projects</Link>
            </Button>
          }
        />
      </div>
    );
  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Projects"
        parentHref="/projects"
        title={item.title}
        description={`${item.sourceReference} · updated ${item.updatedDate}`}
      />
      <NoticePanel className="mb-6">
        Published by the {item.issuingOffice}. Figures reflect the latest reviewed position for this project.
      </NoticePanel>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
        <ContentPanel as="article">
          <h2>Approved public summary</h2>
          <p className="mt-3">{item.body}</p>
          <dl className="registry-facts mt-5">
            {item.publicFields.map((field) => (
              <div key={field}>
                <dt>Published field</dt>
                <dd>{field}</dd>
              </div>
            ))}
          </dl>
          {item.correctionNote && (
            <p className="mt-5 rounded-lg bg-muted p-3 text-sm">
              <strong>Correction:</strong> {item.correctionNote}
            </p>
          )}
          <div className="mt-5 rounded-lg border p-4 text-sm">
            <strong>Site progress</strong>
            <p className="muted mt-2">
              Ramp, lighting and wayfinding improvement area, recorded at the most recent field update.
            </p>
          </div>
        </ContentPanel>
        <ContentPanel as="aside">
          <ShieldCheck className="text-primary" />
          <h2 className="mt-3">Not published here</h2>
          <p className="muted mt-2">Excluded from this summary:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {item.blockedFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
          <PanelDivider />
          <Button asChild variant="outline" className="w-full">
            <Link href="/requests/new">Send feedback</Link>
          </Button>
        </ContentPanel>
      </div>
    </div>
  );
}

export function TransparencyView() {
  const [opened, setOpened] = useState<string>();
  const [status, setStatus] = useState("all");

  const statuses = [...new Set(DISCLOSURE_DOCUMENTS.map((item) => item.status))];
  const documents = DISCLOSURE_DOCUMENTS.filter((item) => status === "all" || item.status === status).map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    body: item.note,
    topics: item.topics,
    issuingOffice: item.issuingOffice,
    issueDate: item.date,
    updatedDate: item.date,
    status: item.status,
    available: item.available,
  }));
  const [featured, ...rest] = documents;

  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Home"
        parentHref="/"
        title="Transparency library"
        description="Disclosure summaries, ordinances and procurement references, listed by the office that issued them."
      />

      <div className="pub-filters">
        <fieldset className="pub-filter-group">
          <legend className="pub-filter-label">Status</legend>
          <div className="pub-chip-filter">
            <button type="button" data-state={status === "all" ? "on" : "off"} onClick={() => setStatus("all")}>
              All
            </button>
            {statuses.map((name) => (
              <button
                key={name}
                type="button"
                data-state={status === name ? "on" : "off"}
                onClick={() => setStatus(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No documents match"
          description="Choose another status to see the documents on record."
        />
      ) : (
        <>
          {featured ? (
            <FeaturedPublication
              item={featured}
              action="Open document"
              footer={
                <div className="pub-card-action">
                  <Button variant="outline" disabled={!featured.available} onClick={() => setOpened(featured.id)}>
                    {!featured.available
                      ? "Attachment pending"
                      : opened === featured.id
                        ? "Preview open"
                        : "Open document"}
                  </Button>
                </div>
              }
            />
          ) : null}
          {rest.length ? (
            <>
              <SectionRule title="More documents" />
              <PublicationGrid>
                {rest.map((item) => (
                  <PublicationCard
                    key={item.id}
                    item={item}
                    footer={
                      <div className="pub-card-action">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!item.available}
                          onClick={() => setOpened(item.id)}
                        >
                          {!item.available
                            ? "Attachment pending"
                            : opened === item.id
                              ? "Preview open"
                              : "Open document"}
                        </Button>
                      </div>
                    }
                  />
                ))}
              </PublicationGrid>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function ContentBoundary({ children }: { children: ReactNode }) {
  // Reachable from a public route as well as the operations shell. Outside
  // the workspace there is no persona and no scenario switch, so the public
  // surface reads as a non-staff role in the normal state.
  const workspace = useOptionalWorkspaceSession();
  const role = workspace?.role ?? "partner";
  const scenario = workspace?.scenario ?? "normal";
  const setScenario = workspace?.setScenario ?? noopScenarioChange;
  if (role !== "municipal" || scenario === "denied")
    return (
      <PermissionState
        title="Editorial workspace unavailable"
        description="Choose the Municipal staff demo role. Drafts, redaction checks and reviewer notes are not exposed."
      />
    );
  if (scenario === "slow") return <LoadingState label="Loading editorial snapshot…" />;
  if (scenario === "error")
    return (
      <ErrorState
        title="Editorial records could not load"
        description="The local content projection failed. No CMS or public site was contacted."
        onRetry={() => setScenario("normal")}
      />
    );
  if (scenario === "empty")
    return (
      <EmptyState
        icon={FileQuestion}
        headingLevel="h1"
        title="No editorial records"
        description="The selected local projection contains no content tasks."
      />
    );
  return children;
}

export function ContentQueueView() {
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const records = publicationRepository
    .listEditorial()
    .filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (status === "all" || item.status === status) &&
        (owner === "all" || item.owner === owner),
    );
  return (
    <ContentBoundary>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M16 · Editorial control</span>
          <h1>Content review queue</h1>
          <p>Keep drafts, returned items, published snapshots, corrections and archives distinct.</p>
        </div>
      </div>
      <NoticePanel className="mb-6">
        Public routes read only published or corrected snapshots. Opening this queue never publishes content.
      </NoticePanel>
      <ContentPanel className="mb-6">
        <div className="grid gap-3 md:grid-cols-3">
          <NativeSelect aria-label="Content type" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="all">All content types</option>
            {[...new Set(publicationRepository.listEditorial().map((item) => item.kind))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="Publication status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            {[...new Set(publicationRepository.listEditorial().map((item) => item.status))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </NativeSelect>
          <NativeSelect aria-label="Content owner" value={owner} onChange={(event) => setOwner(event.target.value)}>
            <option value="all">All owners</option>
            {[...new Set(publicationRepository.listEditorial().map((item) => item.owner))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </NativeSelect>
        </div>
      </ContentPanel>
      {records.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No content matches these filters"
          description="Change the content type, status, or owner filter to return to the local editorial queue."
        />
      ) : (
        <div className="grid gap-4">
          {records.map((item) => (
            <ContentPanel as="article" key={item.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <span className="eyebrow">
                    {item.kind} · {item.id}
                  </span>
                  <h2 className="mt-1 text-base">{item.title}</h2>
                </div>
                <StatusBadge
                  tone={
                    ["published", "corrected"].includes(item.status)
                      ? "success"
                      : item.status === "returned"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {item.status}
                </StatusBadge>
              </div>
              <p className="muted mt-3">{item.summary}</p>
              <p className="muted mt-2 text-sm">
                {item.sourceModule} · {item.sourceReference} · {item.sourceVersion}
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href={`/ops/content/${item.id}/edit`}>Open structured review</Link>
              </Button>
            </ContentPanel>
          ))}
        </div>
      )}
    </ContentBoundary>
  );
}

export function ContentEditorView({ contentId }: { contentId: string }) {
  const source = publicationRepository.findEditorial(contentId.toUpperCase());
  const [status, setStatus] = useState(source?.status ?? "draft");
  const [notice, setNotice] = useState<string>();
  const [title, setTitle] = useState(source?.title ?? "");
  const [summary, setSummary] = useState(source?.summary ?? "");
  const [body, setBody] = useState(source?.body ?? "");
  const [language, setLanguage] = useState(source?.language ?? "English");
  const [effectiveUntil, setEffectiveUntil] = useState(source?.effectiveUntil ?? "");
  const [altTextReady, setAltTextReady] = useState(source?.altTextReady ?? false);
  const [redactionReady, setRedactionReady] = useState(source?.redactionReady ?? false);
  const [reason, setReason] = useState("Reviewed against the source version and public-field boundary.");
  const [channelPreview, setChannelPreview] = useState("Website and app inbox preview");
  const [sensitiveSelected, setSensitiveSelected] = useState(false);
  if (!source)
    return (
      <ContentBoundary>
        <EmptyState
          icon={FileQuestion}
          headingLevel="h1"
          title="Content record unavailable"
          description="The editorial reference was not found."
          action={
            <Button asChild>
              <Link href="/ops/content">Return to content queue</Link>
            </Button>
          }
        />
      </ContentBoundary>
    );
  const translationApproved = !language.includes("unapproved");
  const ready =
    status === "in-review" &&
    altTextReady &&
    redactionReady &&
    translationApproved &&
    !sensitiveSelected &&
    title.trim().length >= 8 &&
    body.trim().length >= 20;
  const transition = (decision: "review" | "return" | "publish" | "archive") => {
    const updated = publicationRepository.transition(source.id, decision, {
      title,
      summary,
      body,
      language,
      effectiveUntil,
      altTextReady,
      redactionReady,
      reason,
    });
    if (!updated) {
      setNotice("Complete the required content, checks and a reason using at least eight characters.");
      return;
    }
    setStatus(updated.status);
    setNotice(
      decision === "publish"
        ? "Published only in the local public snapshot. No website deployment or notification occurred."
        : decision === "archive"
          ? "Archived locally; public navigation now uses the safe unavailable fallback."
          : decision === "return"
            ? "Returned locally with a specific correction reason."
            : "Submitted to the local review state; public routes remain unchanged.",
    );
  };
  return (
    <ContentBoundary>
      <div className="ops-topline">
        <div>
          <span className="eyebrow">M16 · Structured content review</span>
          <h1>{source.id}</h1>
          <p>{source.title}</p>
        </div>
        <StatusBadge tone={["published", "corrected"].includes(status) ? "success" : "pending"}>{status}</StatusBadge>
      </div>
      <NoticePanel className="mb-6">
        Transitions update this local screen only. No website, social channel, message provider or government posting
        portal is contacted.
      </NoticePanel>
      {notice && (
        <div className="registry-save-notice mb-6" role="status">
          {notice}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)]">
        <ContentPanel as="section">
          <h2>Public projection preview</h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 font-medium text-sm">
              Title
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="grid gap-2 font-medium text-sm">
              Public summary
              <Textarea value={summary} onChange={(event) => setSummary(event.target.value)} />
            </label>
            <label className="grid gap-2 font-medium text-sm">
              Public body
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 font-medium text-sm">
                Language state
                <NativeSelect value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option>English</option>
                  <option>Filipino · unapproved translation</option>
                  <option>Filipino · approved translation</option>
                  <option>Bikol · unapproved translation</option>
                  <option>Bikol · approved translation</option>
                </NativeSelect>
              </label>
              <label className="grid gap-2 font-medium text-sm">
                Effective display until
                <Input type="date" value={effectiveUntil} onChange={(event) => setEffectiveUntil(event.target.value)} />
              </label>
            </div>
            <section className="rounded-lg border bg-muted/30 p-4" aria-label="Public content preview">
              <span className="eyebrow">Preview · {language}</span>
              <h3 className="mt-2">{title || "Untitled public content"}</h3>
              <p className="muted mt-2">{summary || "Add a public summary."}</p>
              <p className="mt-3 text-sm">{body || "Add the approved public body."}</p>
            </section>
          </div>
          <PanelDivider />
          <h3 className="text-base">Selected public fields</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
            {source.publicFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
          <h3 className="mt-5 text-base">Blocked internal fields</h3>
          <p className="muted mt-2 text-sm">
            {source.blockedFields.join(" · ") || "No additional blocked field in this fixture"}
          </p>
        </ContentPanel>
        <ContentPanel as="aside">
          <h2>Accessibility and redaction</h2>
          <div className="mt-4 grid gap-3">
            <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                checked={altTextReady}
                onChange={(event) => setAltTextReady(event.target.checked)}
              />
              Alternative text reviewed
            </label>
            <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                checked={redactionReady}
                onChange={(event) => setRedactionReady(event.target.checked)}
              />
              Redaction and blocked fields reviewed
            </label>
            <StatusBadge tone="neutral">Source date {source.issueDate}</StatusBadge>
            {!translationApproved && (
              <p className="rounded-lg bg-muted p-3 text-sm">Approve the translation before local publication.</p>
            )}
            <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
              <input
                type="checkbox"
                checked={sensitiveSelected}
                onChange={(event) => setSensitiveSelected(event.target.checked)}
              />
              Include blocked internal fields (exception preview)
            </label>
            {sensitiveSelected && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm">
                Sensitive fields cannot be included in a public snapshot. Clear this selection before publication.
              </p>
            )}
            <label className="grid gap-2 font-medium text-sm">
              Local notification preview
              <NativeSelect value={channelPreview} onChange={(event) => setChannelPreview(event.target.value)}>
                <option>Website and app inbox preview</option>
                <option>Website-only preview</option>
                <option>Website, app, and SMS wording preview</option>
              </NativeSelect>
            </label>
            <p className="muted text-sm">{channelPreview} · preview only; nothing will be sent.</p>
          </div>
          <PanelDivider />
          <label className="grid gap-2 font-medium text-sm">
            Review / correction reason
            <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <div className="grid gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={status === "in-review" || status === "archived"}
              onClick={() => transition("review")}
            >
              Submit for local review
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={status !== "in-review"}
              onClick={() => transition("return")}
            >
              Return for correction
            </Button>
            <Button type="button" disabled={!ready} onClick={() => transition("publish")}>
              <Send /> Publish
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!["published", "corrected"].includes(status)}
              onClick={() => transition("archive")}
            >
              <Archive /> Archive
            </Button>
          </div>
          <PanelDivider />
          <h3 className="text-base">Publication history</h3>
          <div className="mt-3 grid gap-2 text-sm">
            {publicationRepository.findEditorial(source.id)?.history.map((entry) => (
              <p key={entry}>• {entry}</p>
            ))}
          </div>
        </ContentPanel>
      </div>
    </ContentBoundary>
  );
}
