import type { ReactNode } from "react";

import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Compact summary of one record. Mobile layouts show these instead of
 * compressing an operational table onto a phone.
 */
export function RecordCard({
  href,
  icon,
  title,
  meta,
  trailing,
  className,
}: {
  href: string;
  icon?: ReactNode;
  title: string;
  meta: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("account-request", className)}>
      {icon}
      <div>
        <strong>{title}</strong>
        <small>{meta}</small>
      </div>
      {trailing ?? <ArrowRight size={17} />}
    </Link>
  );
}
