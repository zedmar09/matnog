import Link from "next/link";

import { ArrowRight, Building2, FileBadge2 } from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { PageHeader } from "@/shared/components/page-header";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";

import { APPLICANT_JOURNEY, CERTIFICATE_CATALOG } from "../data/certificate-journey";

export function CertificateCatalogView() {
  return (
    <div className="site-container page-content">
      <PageHeader
        parent="Services"
        parentHref="/services"
        title="Barangay certificates and clearances"
        description="Choose the document you need. You only need a mobile number to make a request."
      />

      <div className="certificate-catalog-layout">
        <section aria-labelledby="certificate-catalog-title">
          <h2 id="certificate-catalog-title" className="sr-only">
            Choose a document
          </h2>
          <ul className="certificate-type-list">
            {CERTIFICATE_CATALOG.map((item) => (
              <li key={item.id}>
                <span className="certificate-type-icon">
                  {item.audience === "business" ? (
                    <Building2 size={20} aria-hidden="true" />
                  ) : (
                    <FileBadge2 size={20} aria-hidden="true" />
                  )}
                </span>
                <div className="certificate-type-copy">
                  <div className="certificate-type-head">
                    <h3>{item.title}</h3>
                    <StatusBadge tone="neutral">{item.audience}</StatusBadge>
                  </div>
                  <p>{item.purposeGuidance}</p>
                </div>
                <Button asChild>
                  <Link href={`/certificates/new?type=${item.id}`}>
                    Make Request <ArrowRight />
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <aside className="certificate-catalog-aside">
          <ContentPanel as="section">
            <h2>What to prepare</h2>
            <p className="muted">Bring these when you make a request. The barangay confirms them during review.</p>
            <ul className="certificate-prepare-list">
              {CERTIFICATE_CATALOG.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <ul>
                    {item.requirements.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                  <small>{item.feeGuidance}</small>
                </li>
              ))}
            </ul>
          </ContentPanel>

          <ContentPanel as="section">
            <h2>How it works</h2>
            <ol className="certificate-journey-steps">
              {APPLICANT_JOURNEY.map((stage, index) => (
                <li key={stage.title}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{stage.title}</strong>
                    <p>{stage.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </ContentPanel>
        </aside>
      </div>
    </div>
  );
}
