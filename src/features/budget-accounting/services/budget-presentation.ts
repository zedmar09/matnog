export const financeMoney = (minor: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(minor / 100);

export const financeStatusTone = (status: string): "success" | "warning" | "pending" | "destructive" => {
  const value = status.toLocaleLowerCase();
  if (
    value.includes("approved") ||
    value.includes("released") ||
    value.includes("posted") ||
    value.includes("reconciled") ||
    value.includes("accepted") ||
    value.includes("closed")
  )
    return "success";
  if (
    value.includes("rejected") ||
    value.includes("exception") ||
    value.includes("correction") ||
    value.includes("overdue")
  )
    return "destructive";
  if (
    value.includes("review") ||
    value.includes("pending") ||
    value.includes("closing") ||
    value.includes("authorized")
  )
    return "warning";
  return "pending";
};

export const availabilityState = (appropriated: number, obligated: number) => {
  if (obligated >= appropriated) return "Fully obligated";
  if (obligated / appropriated >= 0.8) return "Low balance";
  return "Available";
};
