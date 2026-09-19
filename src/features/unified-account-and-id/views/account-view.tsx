"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowRight, FileText, LogOut, UserRound } from "lucide-react";

import { PUBLIC_REQUESTS } from "@/features/request-tracking/data/requests";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { RecordCard } from "@/shared/components/record-card";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import { useDemoSession } from "@/shared/providers/demo-session-provider";

import { buildSignInPath } from "../services/account-navigation";
import { resolveAccountState } from "../types/account-context";

/** How each account state presents itself. Verifying a phone proves control
 * of that number; it never stands in for a reviewed resident link. */
const ACCOUNT_STATE_PRESENTATION = {
  visitor: { label: "Phone-verified visitor", tone: "neutral" },
  "resident-link-pending": { label: "Resident link in review", tone: "pending" },
  "verified-resident": { label: "Verified resident", tone: "success" },
} as const;

export function AccountView() {
  const { session, ready, signOut } = useDemoSession();
  const router = useRouter();

  if (!ready) {
    return (
      <div className="site-container page-loading" role="status">
        Opening your account…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={UserRound}
          headingLevel="h1"
          title="Your account starts here."
          description="Sign in with your mobile number to view your profile and service requests."
          action={
            <Button asChild>
              <Link href={buildSignInPath("/account/profile")}>
                Sign in with mobile number
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const accountState = resolveAccountState(session);

  return (
    <div className="site-container page-content">
      <div className="account-header">
        <PageHeader
          title="Hello, Mara."
          description="View your verified profile details and track your municipal service requests."
        />
        <Button
          variant="outline"
          onClick={() => {
            signOut();
            router.replace("/");
          }}
        >
          <LogOut />
          Sign out
        </Button>
      </div>

      <div className="account-grid account-profile-grid">
        <ContentPanel as="section">
          <SectionHeading eyebrow="Citizen profile" title="Profile details" />
          <div className="profile-summary">
            <div className="profile-avatar">MD</div>
            <div>
              <h3>{session.name}</h3>
              <p className="muted">
                {accountState === "verified-resident"
                  ? `Municipal resident ID · ${session.residentAssociation?.personId}`
                  : "No municipal resident record is linked to this account yet."}
              </p>
            </div>
            <StatusBadge tone={ACCOUNT_STATE_PRESENTATION[accountState].tone}>
              {ACCOUNT_STATE_PRESENTATION[accountState].label}
            </StatusBadge>
          </div>
          <PanelDivider />
          {/* Name, address and household come from the linked registry record.
              Until a link is reviewed there is nothing to show but the number
              the account holder verified. */}
          <dl className="registry-facts">
            <div>
              <dt>Mobile number</dt>
              <dd>{session.phone}</dd>
            </div>
            {accountState === "verified-resident" && (
              <>
                <div>
                  <dt>Full name</dt>
                  <dd>Mara Reyes Dela Cruz</dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>12 April 1998</dd>
                </div>
                <div>
                  <dt>Sex</dt>
                  <dd>Female</dd>
                </div>
                <div>
                  <dt>Civil status</dt>
                  <dd>Single</dd>
                </div>
                <div>
                  <dt>Citizenship</dt>
                  <dd>Filipino</dd>
                </div>
                <div>
                  <dt>Occupation</dt>
                  <dd>Tourism assistant</dd>
                </div>
                <div>
                  <dt>Barangay</dt>
                  <dd>Demo Barangay A</dd>
                </div>
                <div>
                  <dt>Residential address</dt>
                  <dd>Purok 2, Demo Barangay A, Matnog, Sorsogon</dd>
                </div>
                <div>
                  <dt>Household record</dt>
                  <dd>DEMO-HH-001</dd>
                </div>
              </>
            )}
          </dl>
          {accountState !== "verified-resident" && (
            <p className="small-note">
              Link a municipal resident record to see your registered name, barangay, address and household here.
              Verifying a mobile number does not link one.
            </p>
          )}
        </ContentPanel>

        <ContentPanel as="section">
          <SectionHeading
            eyebrow="Municipal services"
            title="Your requests"
            description="Open a request to review its current status and next step."
          />
          <div className="account-request-list">
            {PUBLIC_REQUESTS.map((request) => (
              <RecordCard
                key={request.envelope.id}
                href={`/track?reference=${request.envelope.id}`}
                icon={<FileText size={22} />}
                title={request.title}
                meta={`${request.envelope.reference} · ${request.envelope.status}`}
              />
            ))}
          </div>
          <Link href="/services" className="mt-6 text-link">
            Find another service
            <ArrowRight size={16} />
          </Link>
        </ContentPanel>
      </div>
    </div>
  );
}
