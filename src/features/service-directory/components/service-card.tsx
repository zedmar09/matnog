import Link from "next/link";

import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Compass,
  CreditCard,
  FileText,
  HeartHandshake,
  IdCard,
  MessagesSquare,
} from "lucide-react";

import type { Service } from "../types/service";

const icons = {
  certificate: BadgeCheck,
  business: BriefcaseBusiness,
  tourism: Compass,
  id: IdCard,
  payments: CreditCard,
  help: MessagesSquare,
  assistance: HeartHandshake,
  documents: FileText,
};
export function ServiceCard({ service }: { service: Service }) {
  const Icon = icons[service.icon];
  return (
    <Link href={`/services/${service.slug}`} className="service-card">
      <div className="service-card-top">
        <span className="service-icon">
          <Icon size={23} strokeWidth={1.6} />
        </span>
        <ArrowUpRight size={19} className="card-arrow" />
      </div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <span className="service-card-bottom">View service guide</span>
    </Link>
  );
}
