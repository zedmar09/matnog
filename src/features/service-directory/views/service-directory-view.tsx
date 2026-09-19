"use client";
import { useState } from "react";

import { SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { FilterBar } from "@/shared/components/filter-bar";
import { NoticePanel } from "@/shared/components/notice-panel";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { ServiceCard } from "../components/service-card";
import { AUDIENCES, SERVICES } from "../data/services";

export function ServiceDirectoryView({
  initialQuery = "",
  initialAudience = "all",
}: {
  initialQuery?: string;
  initialAudience?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [audience, setAudience] = useState(
    AUDIENCES.some((a) => a.value === initialAudience) ? initialAudience : "all",
  );
  const normalized = query.trim().toLowerCase();
  const matches = SERVICES.filter(
    (service) =>
      (audience === "all" || service.audience === audience) &&
      `${service.title} ${service.description} ${service.office}`.toLowerCase().includes(normalized),
  );
  return (
    <div className="site-container page-content service-directory-page">
      <PageHeader
        title="How can we help you?"
        description="A simple starting point for municipal services. Find a guide and know what to prepare."
      />
      <FilterBar
        searchLabel="Search services"
        searchPlaceholder="Search by service, keyword, or office"
        query={query}
        onQueryChange={setQuery}
        filterLabel="Filter services by audience"
        filters={AUDIENCES}
        filterValue={audience}
        onFilterChange={setAudience}
        filterClassName="landing-filter-tabs"
        results={`${matches.length} service ${matches.length === 1 ? "guide" : "guides"}`}
      />
      {matches.length > 0 ? (
        <div className="service-grid landing-service-grid">
          {matches.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="No matching services"
          description="Try a different keyword or browse all service guides."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setAudience("all");
              }}
            >
              Reset filters
            </Button>
          }
        />
      )}
      <NoticePanel dot>
        These guides illustrate the planned service experience. Requirements, fees, and processing times will be
        confirmed with the LGU.
      </NoticePanel>
    </div>
  );
}
