"use client";

import Link from "next/link";

import { ADMIN_SECTION_META, type AdminRecord, type AdminSection } from "../data/admin-fixtures";

export const ADMIN_SECTIONS = Object.keys(ADMIN_SECTION_META) as AdminSection[];

export function AdministrationTabs({ active }: { active: AdminSection }) {
  return (
    <nav className="ops-area-tabs admin-section-tabs" aria-label="Administration sections">
      {ADMIN_SECTIONS.map((section) => (
        <Link
          key={section}
          href={`/ops/admin/${section}`}
          data-state={active === section ? "on" : "off"}
          aria-current={active === section ? "page" : undefined}
        >
          {ADMIN_SECTION_META[section].label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminSummary({ records }: { records: AdminRecord[] }) {
  const stable = ["Active", "Applied", "Approved", "Delivered", "Healthy", "Recorded", "Resolved", "Validated"];
  const attention = ["Critical", "Degraded", "Delivery failed", "On hold", "Validation failed"];
  const pending = [
    "Assigned",
    "Draft",
    "In review",
    "Investigating",
    "Needs review",
    "Pending activation",
    "Queued",
    "Requested",
  ];
  const items = [
    { label: "Total records", value: records.length, detail: "records in scope" },
    {
      label: "Current",
      value: records.filter((item) => stable.includes(item.status)).length,
      detail: "active or completed",
    },
    {
      label: "Pending",
      value: records.filter((item) => pending.includes(item.status)).length,
      detail: "awaiting action",
    },
    {
      label: "Attention",
      value: records.filter((item) => attention.includes(item.status)).length,
      detail: "requires intervention",
    },
  ];
  return (
    <section className="treasury-summary-grid" aria-label="Administration summary">
      {items.map((item) => (
        <div className="treasury-summary-card" key={item.label}>
          <div className="treasury-summary-heading">
            <span>{item.label}</span>
          </div>
          <div className="treasury-summary-line">
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </div>
        </div>
      ))}
    </section>
  );
}
