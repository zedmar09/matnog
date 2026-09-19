import type {
  PaymentLedgerRecord,
  PaymentSourceModuleId,
  RevenuePostingReadiness,
  RevenuePostingSummary,
  SourceModulePaymentProjection,
  SourcePaymentGateStatus,
} from "../types/payment-treasury";

const SOURCE_MODULES: Record<
  PaymentSourceModuleId,
  { label: string; route: string; decision: string; blocked: string; satisfied: string }
> = {
  M03: {
    label: "Business permits and licensing",
    route: "/services/business-permits",
    decision: "Permit review and issuance remain with M03",
    blocked: "M03 issuance remains blocked while the payment gate is incomplete.",
    satisfied: "Payment is satisfied. M03 still evaluates office reviews, inspection, and the permit decision.",
  },
  M04: {
    label: "Tourism and maritime operations",
    route: "/services/tourism-registration",
    decision: "Trip and departure readiness remain with M04",
    blocked: "M04 departure remains blocked while the payment gate is incomplete.",
    satisfied:
      "Payment is satisfied. M04 still evaluates documents, headcount, vessel, holds, and departure readiness.",
  },
  M07: {
    label: "Barangay certifications and clearances",
    route: "/services/barangay-certificates",
    decision: "Certificate review and release remain with M07",
    blocked: "M07 release remains blocked while the payment gate is incomplete.",
    satisfied: "Payment is satisfied. M07 still evaluates eligibility, review, approval, and release.",
  },
};

function moduleId(record: PaymentLedgerRecord): PaymentSourceModuleId {
  const prefix = record.lifecycle.assessment.serviceModule.slice(0, 3);
  if (prefix === "M03" || prefix === "M04" || prefix === "M07") return prefix;
  throw new Error(`Unsupported payment source module: ${prefix}`);
}

function paymentGateStatus(record: PaymentLedgerRecord): SourcePaymentGateStatus {
  const assessment = record.lifecycle.assessment;
  const exceptionCollection = record.lifecycle.collections.some((collection) =>
    ["partially-refunded", "refunded", "reversed", "charged-back"].includes(collection.status),
  );
  const exceptionSettlement = record.lifecycle.settlements.some((settlement) => settlement.status === "exception");
  if (exceptionCollection || exceptionSettlement) return "exception";
  if (assessment.balance.minorUnits === 0 && record.lifecycle.collections.length > 0) return "satisfied";
  if (assessment.allocated.minorUnits > 0) return "partial";
  return "pending";
}

export function sourceModulePaymentProjection(record: PaymentLedgerRecord): SourceModulePaymentProjection {
  const sourceId = moduleId(record);
  const config = SOURCE_MODULES[sourceId];
  const status = paymentGateStatus(record);
  const payee = record.lifecycle.assessment.payee;
  const paymentGateLabel =
    status === "satisfied"
      ? "Payment satisfied"
      : status === "partial"
        ? "Partially paid"
        : status === "exception"
          ? "Payment exception"
          : "Payment incomplete";
  return {
    moduleId: sourceId,
    moduleLabel: config.label,
    serviceReference: record.lifecycle.assessment.serviceReference,
    sourceRoute: config.route,
    assessmentId: record.lifecycle.assessment.envelope.id,
    paymentGateStatus: status,
    paymentGateLabel,
    sourceDecisionLabel: config.decision,
    guidance:
      status === "satisfied"
        ? config.satisfied
        : status === "exception"
          ? `The collection has an adjustment exception. ${config.decision}.`
          : config.blocked,
    payeeBoundary:
      payee.kind === "private-operator"
        ? "Private-operator payee; this charge does not satisfy a municipal or barangay assessment."
        : `This assessment has one ${payee.kind} payee: ${payee.label}.`,
  };
}

function readinessFor(record: PaymentLedgerRecord): {
  readiness: RevenuePostingReadiness;
  label: string;
  reason: string;
} {
  const collection = record.lifecycle.collections.at(-1);
  if (!collection) throw new Error("A posting projection requires a confirmed collection.");
  const payee = record.lifecycle.assessment.payee;
  const settlement = record.lifecycle.settlements.at(-1);
  if (payee.kind === "private-operator") {
    return {
      readiness: "excluded-private-payee",
      label: "Excluded from municipal revenue",
      reason: "The collection belongs to a private operator and is not a municipal or barangay posting row.",
    };
  }
  if (["partially-refunded", "refunded", "reversed", "charged-back"].includes(collection.status)) {
    return {
      readiness: "held-adjustment",
      label: "Held for adjustment review",
      reason: "The collection has a refund, reversal, or chargeback state and cannot be posted as ordinary revenue.",
    };
  }
  if (collection.unallocatedAmount.minorUnits > 0) {
    return {
      readiness: "held-unallocated",
      label: "Held for allocation",
      reason: "The collection contains an unallocated amount that needs a Treasury decision before mapping.",
    };
  }
  if (settlement?.status !== "matched") {
    return {
      readiness: "held-reconciliation",
      label: "Held for reconciliation",
      reason: settlement
        ? "The provider and bank evidence still have a settlement difference."
        : "No matched settlement evidence is attached to this collection yet.",
    };
  }
  return {
    readiness: "ready-for-mapping",
    label: "Ready for account mapping",
    reason: "The collection is allocated and its settlement is matched, so account mapping can proceed.",
  };
}

export function revenuePostingProjection(record: PaymentLedgerRecord): RevenuePostingSummary | null {
  const collection = record.lifecycle.collections.at(-1);
  if (!collection) return null;
  const assessment = record.lifecycle.assessment;
  const sourceId = moduleId(record);
  const settlement = record.lifecycle.settlements.at(-1);
  const state = readinessFor(record);
  return {
    postingReference: `REV-MAP-2026-${collection.envelope.id.replace("DEMO-PAY-", "")}`,
    collectionId: collection.envelope.id,
    assessmentId: assessment.envelope.id,
    serviceReference: assessment.serviceReference,
    moduleId: sourceId,
    payeeLabel: assessment.payee.label,
    grossAmount: { currency: "PHP", minorUnits: collection.grossAmount.minorUnits },
    allocatedAmount: { currency: "PHP", minorUnits: collection.allocatedAmount.minorUnits },
    unallocatedAmount: { currency: "PHP", minorUnits: collection.unallocatedAmount.minorUnits },
    ...(settlement ? { settlementId: settlement.envelope.id, settlementStatus: settlement.status } : {}),
    readiness: state.readiness,
    readinessLabel: state.label,
    mappingLabel:
      assessment.payee.kind === "barangay"
        ? "Barangay collection clearing"
        : assessment.payee.kind === "private-operator"
          ? "No municipal mapping"
          : "Municipal service revenue",
    reason: state.reason,
  };
}

export function revenuePostingProjections(records: readonly PaymentLedgerRecord[]): RevenuePostingSummary[] {
  return records.flatMap((record) => {
    const projection = revenuePostingProjection(record);
    return projection ? [projection] : [];
  });
}
