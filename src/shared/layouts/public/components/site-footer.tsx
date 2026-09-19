import Link from "next/link";

import { Apple, ArrowUpRight, MapPin, Play } from "lucide-react";

import { Brand } from "@/shared/components/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="about">
      <div className="site-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand inverse variant="love" />
            <p>
              One connected place for our people,
              <br />
              our businesses, and our visitors.
            </p>
            <span className="footer-location">
              <MapPin size={15} />
              Matnog, Sorsogon, Philippines
            </span>
            <div className="footer-stores">
              <span className="footer-stores-label">Get the mobile app</span>
              <div className="footer-store-badges">
                <Link href="/services" className="footer-store-badge" aria-label="Download on the App Store">
                  <Apple size={22} aria-hidden="true" />
                  <span>
                    <small>Download on the</small>
                    App Store
                  </span>
                </Link>
                <Link href="/services" className="footer-store-badge" aria-label="Get it on Google Play">
                  <Play size={20} aria-hidden="true" />
                  <span>
                    <small>Get it on</small>
                    Google Play
                  </span>
                </Link>
              </div>
            </div>
          </div>
          <div>
            <h2>Public services</h2>
            <Link href="/services?audience=residents">For residents</Link>
            <Link href="/services?audience=businesses">For businesses</Link>
            <Link href="/visit">For visitors</Link>
            <Link href="/track">Track a request</Link>
          </div>
          <div>
            <h2>Your municipality</h2>
            <Link href="/advisories">Municipal advisories</Link>
            <Link href="/projects">Published projects</Link>
            <Link href="/transparency">Transparency library</Link>
            <Link href="/offices">Office directory</Link>
            <Link href="/services">Service directory</Link>
            <Link href="/help">Help & information</Link>
            <Link href="/staff/sign-in">
              Staff workspace <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="footer-help">
            <h2>Need help finding a service?</h2>
            <p>Find out which office handles your request and what to prepare before you visit.</p>
            <Link href="/help" className="footer-help-link">
              Find the right office <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Municipality of Matnog</span>
          <div>
            <Link href="/help#privacy">Privacy information</Link>
            <Link href="/help#accessibility">Accessibility</Link>
            <Link href="/credits">Image credits</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
