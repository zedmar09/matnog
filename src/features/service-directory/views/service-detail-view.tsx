import Link from "next/link";

import { ArrowRight, Check, CircleHelp, Clock, Mail, PhilippinePeso, Phone } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import type { Service } from "../types/service";

/**
 * Where each service's request form lives. Certificates keep their own form
 * because it feeds the request tracker; everything else uses the shared flow.
 */
function requestHref(service: Service, requestType?: string) {
  const base = service.slug === "barangay-certificates" ? "/certificates/new" : `/services/${service.slug}/request`;
  return requestType ? `${base}?type=${requestType}` : base;
}

export function ServiceDetailView({ service }: { service: Service }) {
  return (
    <div className="site-container page-content">
      <PageHeader title={service.title} description={service.description} parent="Services" parentHref="/services" />

      <section className="service-office-card" aria-labelledby="service-office-title">
        <p className="service-office-eyebrow">Office in charge</p>
        <h2 id="service-office-title">{service.office}</h2>
        <p className="service-office-sub">{service.officeInfo}</p>
        <ul className="service-office-facts">
          <li>
            <Clock size={16} aria-hidden="true" />
            <span className="sr-only">Service hours</span>
            {service.serviceHours}
          </li>
          <li>
            <PhilippinePeso size={16} aria-hidden="true" />
            <span className="sr-only">Fee</span>
            {service.sampleFee ?? "Confirm with the office"}
          </li>
          <li>
            <a href={`tel:${service.contactNumber.split(" local ")[0].replaceAll(/[^+\d]/g, "")}`}>
              <Phone size={16} aria-hidden="true" />
              <span className="sr-only">Contact number</span>
              {service.contactNumber}
            </a>
          </li>
          <li>
            <a href={`mailto:${service.email}`}>
              <Mail size={16} aria-hidden="true" />
              <span className="sr-only">Email address</span>
              {service.email}
            </a>
          </li>
        </ul>
      </section>

      <div className="certificate-catalog-layout">
        <section aria-labelledby="service-offerings-title">
          <h2 id="service-offerings-title" className="sr-only">
            Choose the service you need
          </h2>
          <ul className="certificate-type-list">
            {service.offerings.map((offering) => (
              <li key={offering.title}>
                <div className="certificate-type-copy">
                  <div className="certificate-type-head">
                    <h3>{offering.title}</h3>
                    <span className="service-offering-fee">{offering.sampleFee}</span>
                  </div>
                  <p>{offering.description}</p>
                </div>
                <Button asChild>
                  <Link href={requestHref(service, offering.requestType)}>
                    Make Request <ArrowRight />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>

          <ContentPanel as="section" className="mt-5">
            <h2>How it works</h2>
            <ol className="certificate-journey-steps">
              {service.steps.map((step, index) => (
                <li key={step}>
                  <span>{index + 1}</span>
                  <div>
                    <p>{step}</p>
                  </div>
                </li>
              ))}
            </ol>
          </ContentPanel>
        </section>

        <aside className="certificate-catalog-aside">
          <ContentPanel as="section">
            <h2>What to prepare</h2>
            <p className="muted">The responsible office confirms the final requirements during review.</p>
            <ul className="check-list">
              {service.preparation.map((item) => (
                <li key={item}>
                  <Check size={17} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <PanelDivider />
            <h3>Common requirements by type</h3>
            <ul className="certificate-prepare-list">
              {service.offerings.map((offering) => (
                <li key={offering.title}>
                  <strong>{offering.title}</strong>
                  <ul>
                    {offering.requirements.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                  <small>Fee: {offering.sampleFee}</small>
                </li>
              ))}
            </ul>
          </ContentPanel>

          <Link className="help-inline" href="/help">
            <CircleHelp size={18} />
            Need help finding an office?
            <ArrowRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
