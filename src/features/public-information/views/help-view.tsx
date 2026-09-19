import Link from "next/link";

import { ArrowRight, Building2 } from "lucide-react";

import { SERVICES } from "@/features/service-directory/data/services";
import { PageHeader } from "@/shared/components/page-header";
export function HelpView() {
  return (
    <div className="site-container page-content">
      <PageHeader
        title="Let’s find your next step."
        description="Use the service directory to identify the office that can help with your request."
      />
      <div className="help-office-grid">
        {SERVICES.map((service) => (
          <Link key={service.slug} className="office-row" href={`/services/${service.slug}`}>
            <Building2 size={20} />
            <span>
              <strong>{service.office}</strong>
              <small>{service.title}</small>
            </span>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
      <section className="content-panel" id="privacy">
        <h2>Your privacy in this preview</h2>
        <p>
          This frontend prototype uses records. The sign-in flow does not send SMS or transmit the entered number. Only
          a fixed sample account marker is stored on this browser. Sign out to clear it. Please use the supplied demo
          number and reference numbers.
        </p>
        <p>No official request, payment, or identity verification takes place in this preview.</p>
      </section>
      <section className="content-panel" id="accessibility">
        <h2>Designed to be easier to use</h2>
        <p>
          Browse with a keyboard, follow visible focus indicators, and use the mobile navigation on smaller screens.
          Forms show written validation messages, and service status includes text labels.
        </p>
        <p>
          Official office contact details, language translations, and supported assistance channels will be confirmed
          with the LGU before publication.
        </p>
      </section>
    </div>
  );
}
