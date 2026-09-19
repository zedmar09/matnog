"use client";

import { useState } from "react";

import type { FieldError } from "@/shared/components/error-summary";
import type { WorkspaceRole } from "@/shared/providers/workspace-session-provider";

import type { certificateRepository } from "../services/certificate-repository";
import type { CertificateWorkspaceRecord } from "../types/certificate-records";

export type CertificateLifecycle = {
  /** True when the active role may change the record, not only read it. */
  canAct: boolean;
  actionErrors: FieldError[];
  setActionErrors: (errors: FieldError[]) => void;
  notice: string | undefined;
  /** Applies a repository result, surfacing its notice or errors. */
  apply: (result: ReturnType<typeof certificateRepository.approveReview>, successMessage: string) => boolean;
};

/**
 * One feedback channel for every lifecycle action on a certificate record.
 * The approve action sits in the page header while the rest live further down
 * the page, so both write their notice and errors to the same place.
 */
export function useCertificateLifecycle({
  role,
  onUpdated,
}: {
  role: WorkspaceRole;
  onUpdated: (record: CertificateWorkspaceRecord) => void;
}): CertificateLifecycle {
  const [actionErrors, setActionErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState<string>();

  function apply(result: ReturnType<typeof certificateRepository.approveReview>, successMessage: string) {
    if (result.kind === "success") {
      setActionErrors([]);
      setNotice(successMessage);
      onUpdated(result.data);
      return true;
    }
    setNotice(undefined);
    if (result.kind === "invalid") {
      setActionErrors(result.errors);
      return false;
    }
    setActionErrors([
      {
        id: "lifecycle-actions",
        message: result.kind === "denied" ? result.message : "The action could not be completed.",
      },
    ]);
    return false;
  }

  return { canAct: role === "barangay", actionErrors, setActionErrors, notice, apply };
}
