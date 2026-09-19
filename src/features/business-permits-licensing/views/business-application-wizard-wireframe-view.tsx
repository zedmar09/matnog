"use client";

import { useState } from "react";

import Link from "next/link";

import { ContentPanel } from "@/shared/components/content-panel";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";

import { BusinessApplicantBoundary } from "../components/business-applicant-boundary";
import { BusinessPathSummary } from "../components/business-journey-map";
import { BUSINESS_APPLICATION_PATHS } from "../data/business-journey";
import { businessRepository } from "../services/business-repository";
import type { BusinessApplicationPathId } from "../types/business-journey";

const stepLabels = [
  "Identity and authority",
  "Activity and location",
  "Requirements and evidence",
  "Review local draft",
];

export function BusinessApplicationWizardWireframeView({ pathId }: { pathId: BusinessApplicationPathId }) {
  const [step, setStep] = useState(1);
  const [path, setPath] = useState(pathId);
  const [applicantRole, setApplicantRole] = useState("authorized-representative");
  const [activity, setActivity] = useState("Tour booking and visitor assistance");
  const [location, setLocation] = useState("Matnog Port District");
  const [registrationEvidence, setRegistrationEvidence] = useState("reuse");
  const [safetyEvidence, setSafetyEvidence] = useState("attach");
  const [savedId, setSavedId] = useState<string>();
  const [error, setError] = useState("");

  const next = () => {
    if (step === 2 && (!activity.trim() || !location.trim())) {
      setError("Activity and location are required before continuing.");
      return;
    }
    setError("");
    setStep((value) => Math.min(4, value + 1));
  };

  return (
    <BusinessApplicantBoundary>
      <div className="site-container page-content">
        <PageHeader
          parent="Business permits"
          parentHref="/businesses"
          title="Prepare a business application"
          description="Save and resume a local draft for new, renewal, amendment or closure."
        />
        <NoticePanel className="mb-6">
          A nonresident authorized representative may apply. This local UI demo submits nothing to a government system.
        </NoticePanel>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(19rem,.9fr)]">
          <ContentPanel>
            <span className="eyebrow">Step {step} of 4 · Editable draft</span>
            <h2 className="mt-1">{stepLabels[step - 1]}</h2>
            <div className="mt-5 grid gap-4">
              {step === 1 && (
                <>
                  <label className="grid gap-2 font-medium text-sm">
                    Application path
                    <NativeSelect
                      value={path}
                      onChange={(event) => setPath(event.target.value as BusinessApplicationPathId)}
                    >
                      {BUSINESS_APPLICATION_PATHS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.shortLabel}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                  <label className="grid gap-2 font-medium text-sm">
                    Applicant role
                    <NativeSelect value={applicantRole} onChange={(event) => setApplicantRole(event.target.value)}>
                      <option value="owner">Business owner</option>
                      <option value="authorized-representative">Authorized representative</option>
                    </NativeSelect>
                  </label>
                  <div className="rounded-lg border p-4 text-sm">
                    <strong>Demo Bay Tours · DEMO-BIZ-001</strong>
                    <p className="muted mt-1">Matnog booking office · active sample representation</p>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <label className="grid gap-2 font-medium text-sm">
                    Business activity
                    <Input value={activity} onChange={(event) => setActivity(event.target.value)} />
                  </label>
                  <label className="grid gap-2 font-medium text-sm">
                    Establishment location
                    <Input value={location} onChange={(event) => setLocation(event.target.value)} />
                  </label>
                </>
              )}
              {step === 3 && (
                <>
                  <label className="grid gap-2 font-medium text-sm">
                    Business registration evidence
                    <NativeSelect
                      value={registrationEvidence}
                      onChange={(event) => setRegistrationEvidence(event.target.value)}
                    >
                      <option value="reuse">Reuse valid attachment · expires 31 Jan 2027</option>
                      <option value="attach">Choose a different local sample file</option>
                    </NativeSelect>
                  </label>
                  <label className="grid gap-2 font-medium text-sm">
                    Safety evidence
                    <NativeSelect value={safetyEvidence} onChange={(event) => setSafetyEvidence(event.target.value)}>
                      <option value="attach">Choose local sample attachment</option>
                      <option value="missing">Leave missing to preview blocked submission</option>
                    </NativeSelect>
                  </label>
                  <NoticePanel>
                    Attachment choices are local labels only. Reusable evidence shows its expiry before submission.
                  </NoticePanel>
                </>
              )}
              {step === 4 && (
                <dl className="registry-facts">
                  <div>
                    <dt>Path and role</dt>
                    <dd>
                      {path} · {applicantRole.replaceAll("-", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Activity</dt>
                    <dd>{activity || "Missing"}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{location || "Missing"}</dd>
                  </div>
                  <div>
                    <dt>Evidence</dt>
                    <dd>
                      {registrationEvidence === "reuse" ? "registration reused" : "registration selected"} ·{" "}
                      {safetyEvidence === "attach" ? "safety selected" : "safety missing"}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
            {error && (
              <p className="mt-4 text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <Button variant="outline" disabled={step === 1} onClick={() => setStep((value) => value - 1)}>
                Back
              </Button>
              {step < 4 && <Button onClick={next}>Continue</Button>}
              <Button
                variant={step === 4 ? "default" : "outline"}
                disabled={step !== 4 || safetyEvidence === "missing"}
                onClick={() => {
                  if (!activity.trim() || !location.trim()) {
                    setError("Activity and location are required before saving.");
                    return;
                  }
                  setError("");
                  setSavedId(businessRepository.saveDraft({ path, activity, location }).id);
                }}
              >
                Save local draft
              </Button>
              {savedId && (
                <Button asChild variant="outline">
                  <Link href={`/business/applications/${savedId}`}>Open {savedId}</Link>
                </Button>
              )}
            </div>
            {safetyEvidence === "missing" && step === 4 && (
              <p className="muted mt-3 text-sm">Save is blocked until the required safety evidence is selected.</p>
            )}
          </ContentPanel>
          <BusinessPathSummary pathId={path} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {stepLabels.map((label, index) => (
            <ContentPanel key={label}>
              <span className="eyebrow">Step {index + 1}</span>
              <h3 className="mt-1 text-base">{label}</h3>
              <p className="muted mt-2 text-sm">
                {index + 1 < step ? "Completed locally" : index + 1 === step ? "Current step" : "Not started"}
              </p>
            </ContentPanel>
          ))}
        </div>
      </div>
    </BusinessApplicantBoundary>
  );
}
