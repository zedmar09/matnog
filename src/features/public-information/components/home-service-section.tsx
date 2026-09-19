"use client";
import { useState } from "react";

import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { ServiceCard } from "@/features/service-directory/components/service-card";
import { AUDIENCES, SERVICES } from "@/features/service-directory/data/services";
export function HomeServiceSection() {
  const [audience, setAudience] = useState("all");
  const services = SERVICES.filter((service) => audience === "all" || service.audience === audience).slice(0, 6);
  return (
    <section className="landing-services-section site-container" aria-labelledby="services-heading">
      <div className="landing-section-heading">
        <div>
          <h2 id="services-heading">What would you like to do?</h2>
          <p>Find the right service. Know your next step.</p>
        </div>
        <Link href="/services" className="landing-section-link">
          Browse all services
          <ArrowRight size={17} />
        </Link>
      </div>
      <fieldset className="landing-filter-tabs" aria-label="Popular services by audience">
        {AUDIENCES.map((item) => (
          <button
            type="button"
            key={item.value}
            aria-pressed={audience === item.value}
            onClick={() => setAudience(item.value)}
          >
            {item.label}
          </button>
        ))}
      </fieldset>
      <div className="landing-service-grid">
        {services.map((service) => (
          <ServiceCard key={service.slug} service={service} />
        ))}
      </div>
    </section>
  );
}
