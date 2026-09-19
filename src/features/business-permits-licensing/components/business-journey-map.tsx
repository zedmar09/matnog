import Link from "next/link";

import { ArrowRight, Building2, CheckCircle2, Workflow } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";

import { BUSINESS_APPLICATION_PATHS, BUSINESS_RECORD_LAYERS } from "../data/business-journey";
import type { BusinessApplicationPathId, BusinessJourneyStage } from "../types/business-journey";

export function BusinessPathCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {BUSINESS_APPLICATION_PATHS.map((path) => (
        <ContentPanel as="article" key={path.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Building2 aria-hidden="true" className="text-primary" />
            <StatusBadge tone="neutral">{path.shortLabel}</StatusBadge>
          </div>
          <h3 className="mt-4">{path.title}</h3>
          <p className="muted mt-2">{path.purpose}</p>
          {!compact && (
            <>
              <p className="mt-4 text-sm">
                <strong>Starts from:</strong> {path.startsFrom}
              </p>
              <p className="mt-2 text-sm">
                <strong>Correction:</strong> {path.correctionLoop}
              </p>
            </>
          )}
          <Button asChild variant="outline" className="mt-5 w-full sm:w-auto">
            <Link href={`/business/applications/new?type=${path.id}`}>
              Review this path <ArrowRight />
            </Link>
          </Button>
        </ContentPanel>
      ))}
    </div>
  );
}

export function BusinessJourneyMap({
  eyebrow,
  title,
  stages,
}: {
  eyebrow: string;
  title: string;
  stages: readonly BusinessJourneyStage[];
}) {
  return (
    <ContentPanel as="section">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-1">{title}</h2>
      <ol className="mt-5 grid gap-4">
        {stages.map((stage, index) => (
          <li key={stage.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-sm">
              {index + 1}
            </span>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base">{stage.title}</h3>
                <StatusBadge tone="neutral">{stage.owner}</StatusBadge>
              </div>
              <p className="muted mt-1 text-sm">{stage.detail}</p>
              <p className="mt-2 text-sm">
                <strong>Result:</strong> {stage.result}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </ContentPanel>
  );
}

export function BusinessPathSummary({ pathId }: { pathId: BusinessApplicationPathId }) {
  const path = BUSINESS_APPLICATION_PATHS.find((item) => item.id === pathId) ?? BUSINESS_APPLICATION_PATHS[0];
  return (
    <ContentPanel as="section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">{path.shortLabel}</span>
          <h2 className="mt-1">{path.title}</h2>
        </div>
        <Workflow className="text-primary" aria-hidden="true" />
      </div>
      <p className="muted mt-3">{path.purpose}</p>
      <PanelDivider />
      <h3 className="text-base">Required context</h3>
      <ul className="mt-3 grid gap-2 text-sm">
        {path.requiredContext.map((item) => (
          <li className="flex items-start gap-2" key={item}>
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <PanelDivider />
      <h3 className="text-base">Applicable review map</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
        {path.reviewTracks.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-4 rounded-lg bg-muted p-3 text-sm">
        <strong>Correction loop:</strong> {path.correctionLoop}
      </p>
      <p className="mt-3 text-sm">
        <strong>Path result:</strong> {path.result}
      </p>
    </ContentPanel>
  );
}

export function BusinessRecordBoundaries() {
  return (
    <ContentPanel as="section">
      <span className="eyebrow">Record boundaries</span>
      <h2 className="mt-1">Five records, five separate decisions</h2>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {BUSINESS_RECORD_LAYERS.map((layer) => (
          <article className="rounded-lg border p-4" key={layer.reference}>
            <p className="font-semibold text-sm">{layer.title}</p>
            <p className="muted mt-1 text-sm">{layer.reference}</p>
            <p className="mt-3 text-sm">{layer.owns}</p>
            <p className="mt-2 text-sm">
              <strong>Does not decide:</strong> {layer.doesNotDecide}
            </p>
          </article>
        ))}
      </div>
    </ContentPanel>
  );
}
