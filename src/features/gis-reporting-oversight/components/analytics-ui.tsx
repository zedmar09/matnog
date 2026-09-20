import type { LucideIcon } from "lucide-react";
import { Activity, Clock3 } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { StatusBadge, type StatusTone } from "@/shared/components/status-badge";

export function AnalyticsSummary({
  items,
}: {
  items: { label: string; value: string | number; detail: string; icon: LucideIcon }[];
}) {
  return (
    <section className="treasury-summary-grid" aria-label="Analytics summary">
      {items.map((item) => (
        <div className="treasury-summary-card" key={item.label}>
          <div className="treasury-summary-heading">
            <span className="treasury-summary-icon">
              <item.icon size={17} />
            </span>
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

export function RecordHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  status,
  tone = "success",
  value,
  valueLabel,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  tone?: StatusTone;
  value: string;
  valueLabel: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Icon size={22} />
          </span>
          <div>
            <span className="eyebrow">{eyebrow}</span>
            <h2 className="mt-1 text-2xl">{title}</h2>
            <p className="mt-2 max-w-3xl text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
        <div className="min-w-60 rounded-2xl border border-primary/15 bg-card/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{valueLabel}</span>
            <StatusBadge tone={tone}>{status}</StatusBadge>
          </div>
          <strong className="mt-3 block text-3xl tracking-tight">{value}</strong>
        </div>
      </div>
    </section>
  );
}

export function FactGrid({ items }: { items: { label: string; value: React.ReactNode; icon: LucideIcon }[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div className="flex min-w-0 gap-3 rounded-xl border bg-muted/20 p-4" key={item.label}>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <item.icon size={17} />
          </span>
          <div className="min-w-0">
            <dt className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">{item.label}</dt>
            <dd className="mt-1 break-words font-semibold leading-relaxed">{item.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function History({ entries }: { entries: string[] }) {
  return (
    <ContentPanel as="aside">
      <div className="flex items-start gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <Clock3 size={21} />
        </span>
        <div>
          <span className="eyebrow">Activity log</span>
          <h2>Record history</h2>
        </div>
      </div>
      <div className="mt-5 grid gap-0">
        {entries.map((entry, index) => (
          <div className="relative grid grid-cols-[2rem_1fr] gap-3 pb-5 last:pb-0" key={entry}>
            {index < entries.length - 1 && <span className="absolute top-8 bottom-0 left-[.95rem] w-px bg-border" />}
            <span className="relative z-10 grid size-8 place-items-center rounded-full border-4 border-card bg-primary text-primary-foreground text-xs">
              <Activity size={12} />
            </span>
            <div className="rounded-xl border bg-muted/20 p-3 text-sm leading-relaxed">{entry}</div>
          </div>
        ))}
      </div>
    </ContentPanel>
  );
}
