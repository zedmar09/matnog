"use client";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowRight, FileText, LogOut, UserRound } from "lucide-react";

import { PUBLIC_REQUESTS } from "@/features/request-tracking/data/requests";
import {
  type OwnResidentProfile,
  readOwnResidentProfile,
} from "@/features/resident-household-registry/services/registry-selectors";
import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { RecordCard } from "@/shared/components/record-card";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";
import type { RepositoryResult } from "@/shared/data/repository-result";
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
  const personId = session?.residentAssociation?.status === "linked" ? session.residentAssociation.personId : undefined;
  const [profile, setProfile] = useState<RepositoryResult<OwnResidentProfile> | null>(null);

  useEffect(() => {
    if (!personId) return setProfile(null);
    let active = true;
    void readOwnResidentProfile(personId).then((result) => {
      if (active) setProfile(result);
    });
    return () => {
      active = false;
    };
  }, [personId]);

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
          {/* Profile fields are projected from the linked M01 record. */}
          <dl className="registry-facts">
            <div>
              <dt>Mobile number</dt>
              <dd>{session.phone}</dd>
            </div>
            {accountState === "verified-resident" && profile?.kind === "success" && (
              <>
                <div>
                  <dt>Full name</dt>
                  <dd>{profile.data.displayName}</dd>
                </div>
                <div>
                  <dt>Date of birth</dt>
                  <dd>{profile.data.birthDate}</dd>
                </div>
                <div>
                  <dt>Sex</dt>
                  <dd>{profile.data.sex === "female" ? "Female" : "Male"}</dd>
                </div>
                <div>
                  <dt>Civil status</dt>
                  <dd>{profile.data.civilStatus}</dd>
                </div>
                <div>
                  <dt>Citizenship</dt>
                  <dd>{profile.data.citizenship}</dd>
                </div>
                <div>
                  <dt>Occupation</dt>
                  <dd>{profile.data.occupation ?? "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Barangay</dt>
                  <dd>{profile.data.currentBarangay?.label ?? "No current residency"}</dd>
                </div>
                <div>
                  <dt>Residential address</dt>
                  <dd>{profile.data.address ?? "Not recorded"}</dd>
                </div>
                <div>
                  <dt>Household record</dt>
                  <dd>{profile.data.currentHouseholdId ?? "No current household"}</dd>
                </div>
              </>
            )}
          </dl>
          {accountState === "verified-resident" && profile === null && (
            <p className="small-note" role="status">
              Loading your linked resident record…
            </p>
          )}
          {accountState === "verified-resident" && profile !== null && profile.kind !== "success" && (
            <p className="small-note" role="status">
              The linked resident record is unavailable. Your account remains linked, but registry details cannot be
              shown.
            </p>
          )}
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
