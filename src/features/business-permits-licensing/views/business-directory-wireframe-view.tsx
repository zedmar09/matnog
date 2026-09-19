"use client";

import { useState } from "react";

import Link from "next/link";

import { ArrowRight, Building2, MapPin, Plus } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { BusinessApplicantBoundary } from "../components/business-applicant-boundary";
import { BusinessPathCards } from "../components/business-journey-map";
import { DEMO_BUSINESS } from "../data/business-journey";

export function BusinessDirectoryWireframeView() {
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [tradeName, setTradeName] = useState("");
  const [enrolledName, setEnrolledName] = useState("");
  return (
    <BusinessApplicantBoundary>
      <div className="site-container page-content">
        <PageHeader
          parent="Business permits"
          parentHref="/services/business-permits"
          title="Represented businesses"
          description="Choose the business and establishment first, then start the application path that matches the intended change."
        />
        <NoticePanel className="mb-6">
          This requirements-complete UI uses business and permit references. Local draft actions create no official
          registration, assessment, inspection, approval or permit.
        </NoticePanel>

        <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]">
          <ContentPanel as="article">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <span className="eyebrow">{DEMO_BUSINESS.id}</span>
                  <h2 className="mt-1">{DEMO_BUSINESS.name}</h2>
                  <p className="muted mt-1">{DEMO_BUSINESS.activity}</p>
                </div>
              </div>
              <StatusBadge tone="success">represented business</StatusBadge>
            </div>
            <PanelDivider />
            <dl className="registry-facts">
              <div>
                <dt>Authority</dt>
                <dd>{DEMO_BUSINESS.representative}</dd>
              </div>
              <div>
                <dt>Locations</dt>
                <dd>{DEMO_BUSINESS.establishments.length} establishments</dd>
              </div>
              <div>
                <dt>Current sample permit</dt>
                <dd>{DEMO_BUSINESS.currentPermit}</dd>
              </div>
              <div>
                <dt>Resident ID</dt>
                <dd>Not a universal business-owner requirement</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/businesses/${DEMO_BUSINESS.id}`}>
                  Open business record <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/business/applications/new?type=renewal">Map renewal path</Link>
              </Button>
            </div>
          </ContentPanel>

          <ContentPanel as="aside">
            <Plus className="text-primary" aria-hidden="true" />
            <h2 className="mt-3">Add another business</h2>
            <p className="muted mt-2">
              The typed repository keeps business, establishment, owner and authorization references separate. New
              authority enrollment remains outside this presentation fixture.
            </p>
            <PanelDivider />
            <p className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />A searchable list always accompanies any
              future map view.
            </p>
            {showEnrollment && (
              <div className="mt-4 grid gap-3">
                <label className="grid gap-2 font-medium text-sm">
                  Trade name
                  <Input value={tradeName} onChange={(event) => setTradeName(event.target.value)} />
                </label>
                <p className="muted text-xs">Authority evidence is simulated and remains separate from the business.</p>
              </div>
            )}
            <Button
              className="mt-5 w-full"
              disabled={showEnrollment && !tradeName.trim()}
              onClick={() => {
                if (!showEnrollment) {
                  setShowEnrollment(true);
                  return;
                }
                setEnrolledName(tradeName.trim());
                setTradeName("");
                setShowEnrollment(false);
              }}
            >
              {showEnrollment ? "Save local represented business" : "Add represented business"}
            </Button>
            {enrolledName && (
              <p className="mt-3 text-primary text-sm">{enrolledName} added to this local demo session.</p>
            )}
          </ContentPanel>
        </div>

        <section aria-labelledby="business-path-title">
          <span className="eyebrow">Four application paths</span>
          <h2 id="business-path-title" className="mt-1 mb-5">
            Start from the correct business state
          </h2>
          <BusinessPathCards />
        </section>
      </div>
    </BusinessApplicantBoundary>
  );
}
