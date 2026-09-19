import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (str: string): string => {
  if (typeof str !== "string" || !str.trim()) return "?";

  return (
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
};

export function formatCurrency(
  amount: number,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
) {
  const { currency = "PHP", locale = "en-PH", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}

/**
 * Title-cases a stored enum value for display: `awaiting-payment` reads as
 * "Awaiting Payment", `not-met` as "Not Met". Short joining words stay lower
 * case so a label like "Ready for Sign-off" reads as a phrase, and an internal
 * hyphen inside a single word ("sign-off") is preserved.
 */
const MINOR_WORDS = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to"]);

export function formatStatusLabel(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word, index) =>
      index > 0 && MINOR_WORDS.has(word.toLocaleLowerCase())
        ? word.toLocaleLowerCase()
        : word.charAt(0).toLocaleUpperCase() + word.slice(1),
    )
    .join(" ");
}
