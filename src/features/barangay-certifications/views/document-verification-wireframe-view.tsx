"use client";

import Link from "next/link";

import { BadgeCheck, FileQuestion, ShieldX } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";

import { certificateRepository } from "../services/certificate-repository";

const dateFormatter = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short" });

export function DocumentVerificationWireframeView({ token }: { token: string }) {
  const result = certificateRepository.verify(token);
  if (result.kind !== "success") {
    return (
      <div className="site-container page-content">
        <EmptyState
          icon={FileQuestion}
          headingLevel="h1"
          title="Sample document unavailable"
          description="The token is unknown or not available in this public projection. No private certificate details are disclosed."
          action={
            <Button asChild>
              <Link href="/services/certificates">View certificate guidance</Link>
            </Button>
          }
        />
      </div>
    );
  }
  const item = result.data;
  const valid = item.status === "valid";
  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Certificate guidance"
        parentHref="/services/certificates"
        title="Sample document verification"
        description="Minimal M07 public validity projection"
      />
      <NoticePanel className="mb-6">
        This result is a preview and cannot validate an official barangay document.
      </NoticePanel>
      <ContentPanel as="section" className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {valid ? (
            <BadgeCheck className="text-primary" size={34} aria-hidden="true" />
          ) : (
            <ShieldX className="text-destructive" size={34} aria-hidden="true" />
          )}
          <StatusBadge tone={valid ? "success" : "destructive"}>Sample status · {item.status}</StatusBadge>
        </div>
        <h2 className="mt-5">{item.certificateTypeLabel}</h2>
        <dl className="registry-facts mt-6">
          <div>
            <dt>Sample serial</dt>
            <dd>{item.sampleSerial}</dd>
          </div>
          <div>
            <dt>Issuing scope</dt>
            <dd>{item.issuingBarangay}</dd>
          </div>
          <div>
            <dt>Template version</dt>
            <dd>Version {item.templateVersion}</dd>
          </div>
          <div>
            <dt>Issued</dt>
            <dd>{dateFormatter.format(new Date(item.issuedAt))}</dd>
          </div>
          {item.revokedAt && (
            <div>
              <dt>Revoked</dt>
              <dd>{dateFormatter.format(new Date(item.revokedAt))}</dd>
            </div>
          )}
        </dl>
        <p className="muted mt-6 border-t pt-5 text-sm">
          The public result contains no resident name, address, purpose, evidence, payment information or restricted
          case detail.
        </p>
      </ContentPanel>
    </div>
  );
}
