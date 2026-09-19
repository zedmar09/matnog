import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Compass, FileText, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
export function VisitView() {
  return (
    <div className="site-container page-content">
      <PageHeader
        title="A little more Matnog."
        description="Start with the coast. Discover the place. Get ready for your visit."
      />
      <div className="destination-hero">
        <Image src="/images/subic-beach.jpg" alt="Waves washing onto Subic Beach, Matnog" fill priority sizes="100vw" />
        <div>
          <span>Discover Matnog</span>
          <h2>Subic Beach</h2>
          <p>A coastal moment worth slowing down for.</p>
        </div>
      </div>
      <div className="section-heading visit-intro">
        <div>
          <span className="eyebrow">Before the adventure</span>
          <h2>A thoughtful start to your trip.</h2>
        </div>
        <p className="section-side-note">
          Visitor registration and trip management
          <br />
          will arrive with the tourism module.
        </p>
      </div>
      <div className="updates-grid">
        {[
          {
            icon: Compass,
            title: "Explore at your own pace",
            text: "Public destination information is available to browse without an account.",
          },
          {
            icon: FileText,
            title: "Know the planned journey",
            text: "Review the sample registration guide and the information a future trip may need.",
          },
          {
            icon: ShieldCheck,
            title: "Travel with clear information",
            text: "Bookings, maritime documents, and departure reviews are separate steps in the planned service.",
          },
        ].map((item) => (
          <section className="content-panel" key={item.title}>
            <item.icon className="text-primary" size={28} />
            <h3>{item.title}</h3>
            <p className="muted">{item.text}</p>
          </section>
        ))}
      </div>
      <div className="notice-panel">
        <p>
          This is a destination and service preview. It does not show live weather, vessel availability, booking
          confirmation, or permission to depart.
        </p>
        <Button asChild>
          <Link href="/services/tourism-registration">
            View visitor guide
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
