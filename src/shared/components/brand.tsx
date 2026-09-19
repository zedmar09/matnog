import Link from "next/link";

import { Heart, Landmark } from "lucide-react";

import { cn } from "@/shared/lib/utils";

export function Brand({
  inverse = false,
  compact = false,
  variant = "digital",
}: {
  inverse?: boolean;
  compact?: boolean;
  variant?: "digital" | "love";
}) {
  if (variant === "love") {
    return (
      <Link href="/" className={cn("brand brand-love", inverse && "brand-inverse")} aria-label="I love Matnog home">
        <span className="brand-name brand-love-name">
          <span>I</span>
          <Heart className="brand-love-heart" size={22} strokeWidth={2} fill="currentColor" aria-label="love" />
          <span>MATNOG</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/" className={cn("brand", inverse && "brand-inverse")} aria-label="Digital Matnog home">
      <span className="brand-mark">
        <Landmark size={25} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span>
        <span className="brand-name">
          Digital Matnog<span className="brand-dot">.</span>
        </span>
        {!compact && <span className="brand-description">Municipality of Matnog, Sorsogon</span>}
      </span>
    </Link>
  );
}
