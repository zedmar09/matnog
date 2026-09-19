import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Play } from "lucide-react";

import { TOURISM_DESTINATIONS } from "../data/tourism-fixtures";

/**
 * Brand marks for the decorative social rail. lucide-react no longer ships
 * brand icons, so the four glyphs are inlined. They carry no links yet — the
 * municipality's own channels replace them.
 */
const SOCIAL_GLYPHS: { key: string; paths: string[]; rect?: boolean }[] = [
  { key: "facebook", paths: ["M17 2h-3a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"] },
  {
    key: "x",
    paths: [
      "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z",
    ],
  },
  {
    key: "instagram",
    rect: true,
    paths: ["M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z", "M17.5 6.5h.01"],
  },
  {
    key: "youtube",
    paths: [
      "M22.5 6.9a2.8 2.8 0 0 0-1.9-2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5.1 2.8 2.8 0 0 0 1.9 2c1.7.4 8.6.4 8.6.4s6.9 0 8.6-.4a2.8 2.8 0 0 0 1.9-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-5.1z",
      "m10 15.5 5-3.5-5-3.5z",
    ],
  },
];

/**
 * Visit Matnog: one full-screen panel. The header is overlaid transparently on
 * this route, so the photo runs behind the navigation.
 */
export function VisitDiscoveryView() {
  return (
    <section className="visit-hero" aria-labelledby="visit-hero-title">
      <div className="visit-hero-media">
        <Image src="/landing-media/editorial-01.jpg" alt="" fill priority sizes="100vw" />
      </div>

      <div className="visit-hero-inner">
        <div className="visit-hero-grid">
          <div className="visit-hero-copy">
            <span className="visit-dot-grid" aria-hidden="true" />
            <h1 id="visit-hero-title">
              <span>Explore</span>
              <span>Dream</span>
              <span className="visit-hero-outline">Matnog</span>
            </h1>
            <p>
              The southern gateway of Sorsogon, where pink-sand coves, sheltered lagoons and island crossings sit a
              short boat ride apart. Pick a destination, then reserve a trip with an accredited local operator.
            </p>
            <div className="visit-hero-actions">
              <Link className="visit-book-button" href="/visit/book">
                Book now
                <span aria-hidden="true">
                  <Play size={12} />
                </span>
              </Link>
              <span className="visit-chevrons" aria-hidden="true" />
            </div>
          </div>

          <div className="visit-card-rail">
            {TOURISM_DESTINATIONS.map((item) => (
              <article className="visit-card" key={item.id}>
                <div className="visit-card-media">
                  <Image
                    src={item.image ?? "/landing-media/editorial-01.jpg"}
                    alt={item.name}
                    fill
                    sizes="(max-width: 760px) 100vw, 280px"
                  />
                  <span className="visit-card-tag">{item.category}</span>
                </div>
                <div className="visit-card-body">
                  <h2>{item.name}</h2>
                  <p>{item.summary}</p>
                  <p className="visit-card-meta">{item.availability}</p>
                  {item.advisory ? <p className="visit-card-advisory">{item.advisory}</p> : null}
                  <Link className="visit-read-more" href={`/visit/destinations/${item.id}`}>
                    Read more
                    <span aria-hidden="true">
                      <ArrowRight size={12} />
                    </span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <ul className="visit-social">
          {SOCIAL_GLYPHS.map((glyph) => (
            <li key={glyph.key}>
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
                focusable="false"
              >
                {glyph.rect ? <rect x="2" y="2" width="20" height="20" rx="5" /> : null}
                {glyph.paths.map((path) => (
                  <path d={path} key={path} />
                ))}
              </svg>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
