import Link from "next/link";

import { ArrowRight, Building2, FileQuestion, MapPin } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";

import { BusinessApplicantBoundary } from "../components/business-applicant-boundary";
import { BUSINESS_APPLICATION_EXAMPLES, DEMO_BUSINESS } from "../data/business-journey";

export function BusinessDetailWireframeView({ businessId }: { businessId: string }) {
  if (businessId.toUpperCase() !== DEMO_BUSINESS.id) {
    return (
      <BusinessApplicantBoundary>
        <div className="site-container page-content">
          <EmptyState
            icon={FileQuestion}
            headingLevel="h1"
            title="Business record unavailable"
            description="The business reference is not available to the signed-in requester context."
            action={
              <Button asChild>
                <Link href="/businesses">Return to represented businesses</Link>
              </Button>
            }
          />
        </div>
      </BusinessApplicantBoundary>
    );
  }
  const applications = BUSINESS_APPLICATION_EXAMPLES.filter((item) => item.businessId === DEMO_BUSINESS.id);
  return (
    <BusinessApplicantBoundary>
      <div className="site-container page-content">
        <PageHeader
          parent="Represented businesses"
          parentHref="/businesses"
          title={DEMO_BUSINESS.name}
          description={`${DEMO_BUSINESS.id} · ${DEMO_BUSINESS.activity}`}
        />
        <NoticePanel className="mb-6">
          Business identity, each establishment, every application revision and each permit snapshot remain separate
          records in the planned M03 repository.
        </NoticePanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
          <div className="grid gap-6">
            <ContentPanel as="section">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Business profile</span>
                  <h2 className="mt-1">Organization and authority</h2>
                </div>
                <StatusBadge tone="success">represented</StatusBadge>
              </div>
              <dl className="registry-facts mt-5">
                <div>
                  <dt>Organization</dt>
                  <dd>{DEMO_BUSINESS.organizationId}</dd>
                </div>
                <div>
                  <dt>Ownership</dt>
                  <dd>{DEMO_BUSINESS.ownership}</dd>
                </div>
                <div>
                  <dt>Representative</dt>
                  <dd>{DEMO_BUSINESS.representative}</dd>
                </div>
                <div>
                  <dt>Current permit</dt>
                  <dd>{DEMO_BUSINESS.currentPermit}</dd>
                </div>
              </dl>
            </ContentPanel>

            <ContentPanel as="section">
              <span className="eyebrow">Application history map</span>
              <h2 className="mt-1">Current and planned paths</h2>
              <div className="mt-5 grid gap-3">
                {applications.map((application) => (
                  <article className="rounded-lg border p-4" key={application.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base">{application.period}</h3>
                        <p className="muted mt-1 text-sm">{application.id}</p>
                      </div>
                      <StatusBadge tone="pending">{application.status}</StatusBadge>
                    </div>
                    <p className="mt-3 text-sm">Current stage: {application.currentStage}</p>
                    <Button asChild variant="outline" className="mt-4 w-full sm:w-auto">
                      <Link href={`/business/applications/${application.id}`}>
                        Open applicant-safe map <ArrowRight />
                      </Link>
                    </Button>
                  </article>
                ))}
              </div>
            </ContentPanel>
          </div>

          <aside className="grid content-start gap-6">
            <ContentPanel>
              <Building2 className="text-primary" aria-hidden="true" />
              <h2 className="mt-3">Establishments</h2>
              <ul className="mt-4 grid gap-3">
                {DEMO_BUSINESS.establishments.map((establishment) => (
                  <li className="rounded-lg border p-3" key={establishment}>
                    <strong>{establishment}</strong>
                    <p className="muted mt-1 flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {DEMO_BUSINESS.location}
                    </p>
                  </li>
                ))}
              </ul>
              <PanelDivider />
              <Button asChild className="w-full">
                <Link href="/business/applications/new?type=renewal">Start mapped application</Link>
              </Button>
            </ContentPanel>
          </aside>
        </div>
      </div>
    </BusinessApplicantBoundary>
  );
}
