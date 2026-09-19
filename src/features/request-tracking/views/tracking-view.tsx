"use client";
import { useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { Route, Search, SearchX } from "lucide-react";
import { useForm } from "react-hook-form";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PageHeader } from "@/shared/components/page-header";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Timeline } from "@/shared/components/timeline";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { type TrackingValues, trackingSchema } from "../schemas/tracking-schema";
import { findPublicRequest } from "../services/request-repository";
import type { PublicRequest } from "../types/request";

export function TrackingView({ initialReference = "" }: { initialReference?: string }) {
  const [result, setResult] = useState<PublicRequest | null | undefined>(undefined);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TrackingValues>({
    resolver: zodResolver(trackingSchema),
    defaultValues: { reference: initialReference },
  });
  async function submit(values: TrackingValues) {
    setResult(undefined);
    setResult(await findPublicRequest(values.reference));
  }
  return (
    <div className="site-container page-content">
      <PageHeader
        title="Every request has a next step."
        description="Enter a sample reference to see its progress and the office handling it."
      />
      <div className="tracking-layout">
        <ContentPanel className="tracking-form">
          <SectionHeading
            eyebrow="Request tracking"
            title="Where does your request stand?"
            description="Use the reference shown on your sample request."
          />
          <form onSubmit={handleSubmit(submit)} noValidate className="mt-6">
            <FormField
              id="reference"
              label="Reference number"
              error={errors.reference?.message}
              hint="Only sample records are available in this preview."
            >
              {(field) => (
                <Input
                  {...field}
                  {...register("reference")}
                  placeholder="e.g. DEMO-CERT-001"
                  onChange={(event) => {
                    void register("reference").onChange(event);
                    setResult(undefined);
                  }}
                  disabled={isSubmitting}
                />
              )}
            </FormField>
            <Button type="submit" disabled={isSubmitting}>
              <Search />
              {isSubmitting ? "Checking sample request…" : "Track request"}
            </Button>
          </form>
          <div className="demo-hint">
            <p>Try a sample reference</p>
            {["DEMO-CERT-001", "DEMO-BPL-001"].map((reference) => (
              <button
                key={reference}
                className="sample-reference mr-3"
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setValue("reference", reference, { shouldValidate: true });
                  setResult(undefined);
                }}
              >
                {reference}
              </button>
            ))}
            <Button asChild variant="ghost" size="sm">
              <Link href="/track/documents/DOC-2026-0048">Track a sample released document</Link>
            </Button>
          </div>
        </ContentPanel>
        <div className="tracking-result" aria-live="polite" aria-busy={isSubmitting}>
          {isSubmitting ? (
            <EmptyState
              icon={Route}
              iconSize={32}
              title="Checking your reference"
              description="Loading the sample timeline…"
            />
          ) : result === undefined ? (
            <EmptyState
              icon={Route}
              iconSize={34}
              title="A clearer view of your progress."
              description="Your request timeline will appear here."
            />
          ) : result === null ? (
            <EmptyState
              icon={SearchX}
              iconSize={34}
              title="Reference not found"
              description="Check the reference or try one of the sample numbers."
            />
          ) : (
            <ContentPanel as="section">
              <span className="eyebrow">{result.envelope.reference} · Sample request</span>
              <h2>{result.title}</h2>
              <StatusBadge tone="pending">{result.envelope.status}</StatusBadge>
              <p className="small-note">Handling office: {result.office}</p>
              <Timeline steps={result.steps} />
            </ContentPanel>
          )}
        </div>
      </div>
    </div>
  );
}
