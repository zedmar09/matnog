"use client";
import { useState } from "react";

import Link from "next/link";

import { ArrowRight, BadgeCheck, Clock3, QrCode, ShieldX } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";

import { useDemoIdentity } from "../providers/demo-identity-provider";
import { readPublicCredential } from "../services/municipal-id";

export function PublicIdVerificationView({ token }: { token: string }) {
  const { state } = useDemoIdentity();
  const [source, setSource] = useState<"current" | "offline">("current");
  const result = readPublicCredential(state, token);
  const stale = source === "offline";
  return (
    <div className="site-container page-content reading-page">
      <PageHeader
        title="Municipal ID sample verification"
        description="A minimal validity result that does not reveal the holder or resident record."
        parent="Municipal ID guide"
        parentHref="/services/municipal-id"
      />
      <NoticePanel className="mb-6">
        UI demo only. This page does not verify an official credential, contact an LGU registry, or establish identity.
      </NoticePanel>
      <ContentPanel className="public-verification-scenario mb-6">
        <label>
          Verification preview
          <select
            aria-label="Verification preview"
            value={source}
            onChange={(event) => setSource(event.target.value as "current" | "offline")}
          >
            <option value="current">Current demo state</option>
            <option value="offline">Offline cached result</option>
          </select>
        </label>
        <p className="small-note mt-3">
          The offline preview demonstrates an old device result. It must not be treated as current validity.
        </p>
      </ContentPanel>
      {!result ? (
        <EmptyState
          icon={QrCode}
          title="Sample credential not found."
          description="The token is unknown in the current in-memory demo state. Refreshing the browser also resets issued credentials."
          action={
            <Button asChild variant="outline">
              <Link href="/services/municipal-id">
                Read the municipal ID guide
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      ) : (
        <ContentPanel className="public-verification-result">
          <div className="public-verification-icon" data-valid={!stale && result.validity === "valid"}>
            {stale ? <Clock3 /> : result.validity === "valid" ? <BadgeCheck /> : <ShieldX />}
          </div>
          <StatusBadge tone={stale ? "warning" : result.validity === "valid" ? "success" : "destructive"}>
            {stale ? "Stale cached result" : result.statusLabel}
          </StatusBadge>
          <h2>{result.credentialType}</h2>
          <p>
            {stale
              ? "This cached sample was last checked before the device went offline. Reconnect before relying on its current status."
              : result.message}
          </p>
          <dl className="registry-facts">
            <div>
              <dt>Credential reference</dt>
              <dd>{result.credentialReference}</dd>
            </div>
            <div>
              <dt>Issued</dt>
              <dd>{result.issuedAt}</dd>
            </div>
            <div>
              <dt>Valid-until date</dt>
              <dd>{result.validUntil}</dd>
            </div>
            <div>
              <dt>Result generated from</dt>
              <dd>{stale ? "Cached fixture · last checked 15 September 2026, 4:00 PM" : "Current browser state"}</dd>
            </div>
          </dl>
          <p className="small-note">
            Public results omit the holder name, person ID, address, household, evidence, benefits, requests and cases.
          </p>
        </ContentPanel>
      )}
    </div>
  );
}
