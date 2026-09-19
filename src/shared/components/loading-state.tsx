import { Skeleton } from "@/shared/components/ui/skeleton";

const ROW_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

/** Loading placeholder that announces itself to assistive technology. */
export function LoadingState({
  label = "Loading sample data…",
  message = "Loading your workspace…",
  rows = 4,
}: {
  label?: string;
  message?: string;
  rows?: number;
}) {
  return (
    <div className="content-panel" role="status" aria-label={label}>
      <p className="muted mb-5">{message}</p>
      <div className="space-y-4">
        {ROW_KEYS.slice(0, rows).map((key) => (
          <Skeleton key={key} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
