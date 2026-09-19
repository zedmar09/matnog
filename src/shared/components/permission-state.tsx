import type { ReactNode } from "react";

import { LockKeyhole } from "lucide-react";

/**
 * Unauthorised view. Client-side role gating is a demonstration of intended
 * behaviour, not a production security boundary.
 */
export function PermissionState({
  title = "This workspace is not available",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <LockKeyhole size={35} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
