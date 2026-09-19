import Link from "next/link";

import { ArrowDown, ArrowRight, ArrowUpRight, Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { PublicationCard, PublicationGrid } from "../../public-information-transparency/components/publication-cards";
import { publicationRepository } from "../../public-information-transparency/services/publication-repository";
import { HomeServiceSection } from "../components/home-service-section";

export function LandingView() {
  const currentAdvisories = publicationRepository.listPublic("advisory").slice(0, 6);

  return (
    <div className="landing-showcase">
      <section className="landing-media-hero" aria-labelledby="landing-hero-title">
        <video className="landing-media-video" autoPlay loop muted playsInline>
          <source src="/landing-media/subic-video.mp4" type="video/mp4" />
        </video>
        <div className="landing-media-overlay" />
        <div className="site-container landing-hero-inner">
          <div className="landing-hero-copy">
            <h1 id="landing-hero-title" className="landing-hero-slogan">
              <span className="landing-slogan-line">
                <span className="landing-slogan-prefix">MAYAD NA</span>
                <span className="landing-slogan-place">MATNOG</span>
              </span>
            </h1>
            <p className="landing-hero-lead">Local services made simple. All you need is right here.</p>
            <search>
              <form action="/services" className="landing-hero-search">
                <Search size={21} aria-hidden="true" />
                <input name="q" aria-label="Find a municipal service" placeholder="What service are you looking for?" />
                <Button type="submit" aria-label="Search municipal services">
                  Search
                  <ArrowRight size={18} />
                </Button>
              </form>
            </search>
            <div className="landing-popular-searches">
              <span>Popular:</span>
              <Link href="/services/barangay-certificates">Barangay clearance</Link>
              <Link href="/services/business-permits">Business permit</Link>
              <Link href="/services/municipal-id">Municipal ID</Link>
            </div>
            <div className="landing-hero-actions">
              <Button asChild size="lg">
                <Link href="/services">
                  Explore our services
                  <ArrowUpRight />
                </Link>
              </Button>
              <Link href="/track" className="landing-hero-secondary">
                Track your request
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
        <Link href="#services-heading" className="landing-scroll-cue">
          <ArrowDown size={16} />
          Explore I ♥ Matnog
        </Link>
      </section>

      <section className="landing-quick-access" aria-label="Request tracking shortcut">
        <div className="site-container landing-quick-access-inner">
          <div className="landing-quick-copy">
            <span className="landing-overline">Already have a request?</span>
            <h2>Monitor your service request.</h2>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link href="/track">
              Track your request
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <HomeServiceSection />

      <section className="landing-advisory-section" aria-labelledby="current-notices-heading">
        <div className="site-container landing-advisory-content">
          <div className="landing-section-heading">
            <div>
              <h2 id="current-notices-heading">Public notices</h2>
              <p>The latest advisories from the municipal offices.</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/advisories">View all advisories</Link>
            </Button>
          </div>
          {currentAdvisories.length > 0 ? (
            <PublicationGrid>
              {currentAdvisories.map((advisory) => (
                <PublicationCard key={advisory.id} item={{ ...advisory, href: `/advisories/${advisory.id}` }} />
              ))}
            </PublicationGrid>
          ) : (
            <p className="landing-empty-copy">There are no current advisories.</p>
          )}
        </div>
      </section>
    </div>
  );
}
