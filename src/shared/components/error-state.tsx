import { CircleAlert } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

/**
 * Recoverable error with a retry action. Simulated failures must say so, so the
 * reviewer never reads a demo error as a real outage.
 */
export function ErrorState({
  title = "We couldn’t load this preview.",
  description = "This is a simulated error. Retry to return to the normal sample workspace.",
  retryLabel = "Retry with sample data",
  onRetry,
}: {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <CircleAlert size={35} />
      <h2>{title}</h2>
      <p>{description}</p>
      <Button onClick={onRetry}>{retryLabel}</Button>
    </div>
  );
}
