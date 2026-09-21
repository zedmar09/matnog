"use client";

import { useState } from "react";

import Link from "next/link";

import { AlertTriangle, Archive, Building2, FileQuestion, FolderOpen, ShieldCheck } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { FeaturedPublication, PublicationCard, PublicationGrid, SectionRule } from "../components/publication-cards";
import { DISCLOSURE_DOCUMENTS, OFFICE_DIRECTORY } from "../data/publication-fixtures";
import { publicationRepository } from "../services/publication-repository";

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

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-primary/[.035] p-4">
        <div>
          <strong className="block">Explore public information in charts</strong>
          <p className="mt-1 text-muted-foreground text-sm">
            Arrange published notices and disclosure summaries in your own dashboard.
          </p>
        </div>
        <Button asChild>
          <Link href="/transparency/dashboard">Open dashboard</Link>
        </Button>
      </div>

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
