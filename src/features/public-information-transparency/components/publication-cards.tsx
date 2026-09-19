import type { ReactNode } from "react";

import Link from "next/link";

import {
  ArrowUpRight,
  Briefcase,
  Building2,
  ClipboardList,
  Clock,
  CloudRain,
  Droplets,
  FileText,
  Gavel,
  HardHat,
  type LucideIcon,
  Route,
  Scale,
  ScrollText,
  Ship,
  Stethoscope,
  Store,
  Wallet,
} from "lucide-react";

/**
 * Each topic gets its own cover treatment so an index page reads at a glance.
 * Covers are drawn rather than photographed: the municipality's own photography
 * can replace them per record without touching this layout.
 */
const TOPIC_COVERS: Record<string, { icon: LucideIcon; tone: string }> = {
  "Port and ferry": { icon: Ship, tone: "sea" },
  Weather: { icon: CloudRain, tone: "storm" },
  Health: { icon: Stethoscope, tone: "care" },
  "Public market": { icon: Store, tone: "market" },
  Barangay: { icon: Building2, tone: "civic" },
  "Office hours": { icon: Clock, tone: "civic" },
  Infrastructure: { icon: HardHat, tone: "build" },
  Roads: { icon: Route, tone: "build" },
  Water: { icon: Droplets, tone: "sea" },
  Business: { icon: Briefcase, tone: "market" },
  Procurement: { icon: Gavel, tone: "civic" },
  Finance: { icon: Wallet, tone: "market" },
  Ordinance: { icon: Scale, tone: "civic" },
  Legislation: { icon: Scale, tone: "civic" },
  Planning: { icon: ClipboardList, tone: "build" },
  Charter: { icon: ScrollText, tone: "care" },
  "Service standards": { icon: ScrollText, tone: "care" },
};

function coverFor(topics: readonly string[]) {
  for (const topic of topics) {
    const match = TOPIC_COVERS[topic];
    if (match) return match;
  }
  return { icon: FileText, tone: "civic" };
}

function PublicationCover({ topics, label }: { topics: readonly string[]; label: string }) {
  const { icon: Icon, tone } = coverFor(topics);
  return (
    <div className="pub-cover" data-tone={tone}>
      <Icon size={38} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function TopicChips({ topics }: { topics: readonly string[] }) {
  return (
    <span className="pub-chips">
      {topics.map((topic, index) => (
        <span key={topic} data-variant={index === 0 ? "primary" : "secondary"}>
          {topic}
        </span>
      ))}
    </span>
  );
}

/** Initials stand in for a byline avatar; the issuing office is the author here. */
function OfficeAvatar({ office }: { office: string }) {
  const initials = office
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return <span className="pub-avatar">{initials || "M"}</span>;
}

export type PublicationCardItem = {
  id: string;
  title: string;
  summary: string;
  body: string;
  topics: readonly string[];
  issuingOffice: string;
  issueDate: string;
  updatedDate: string;
  href?: string;
  status?: string;
};

/** The lead item: cover on the left, the full standfirst on the right. */
export function FeaturedPublication({
  item,
  action,
  footer,
}: {
  item: PublicationCardItem;
  action: string;
  footer?: ReactNode;
}) {
  return (
    <article className="pub-featured">
      <PublicationCover topics={item.topics} label={item.issuingOffice} />
      <div className="pub-featured-body">
        <div className="pub-meta">
          <TopicChips topics={item.topics} />
          <time dateTime={item.issueDate}>{item.issueDate}</time>
          {item.status ? <span className="pub-status">{item.status}</span> : null}
        </div>
        <h2>{item.title}</h2>
        <p>{item.summary}</p>
        <p>{item.body}</p>
        <p className="pub-office">
          <Building2 size={15} aria-hidden="true" />
          Issued by {item.issuingOffice}
        </p>
        {item.href ? (
          <Link className="pub-read" href={item.href}>
            {action}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        ) : null}
        {footer}
      </div>
    </article>
  );
}

export function PublicationCard({ item, footer }: { item: PublicationCardItem; footer?: ReactNode }) {
  const heading = item.href ? <Link href={item.href}>{item.title}</Link> : item.title;
  return (
    <article className="pub-card">
      <PublicationCover topics={item.topics} label={item.issuingOffice} />
      <div className="pub-card-body">
        <div className="pub-meta">
          <TopicChips topics={item.topics} />
          {item.status ? <span className="pub-status">{item.status}</span> : null}
        </div>
        <h3>{heading}</h3>
        <p>{item.summary}</p>
        <div className="pub-card-foot">
          <OfficeAvatar office={item.issuingOffice} />
          <div>
            <strong>{item.issuingOffice}</strong>
            <small>Updated on: {item.updatedDate}</small>
          </div>
        </div>
        {footer}
      </div>
    </article>
  );
}

export function PublicationGrid({ children }: { children: ReactNode }) {
  return <div className="pub-grid">{children}</div>;
}

export function SectionRule({ title }: { title: string }) {
  return (
    <div className="pub-section-rule">
      <h2>{title}</h2>
    </div>
  );
}
