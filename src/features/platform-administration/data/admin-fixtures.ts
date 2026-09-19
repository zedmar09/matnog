export type AdminWorkspaceKind =
  | "users"
  | "access"
  | "configuration"
  | "audit"
  | "privacy"
  | "notifications"
  | "integrations"
  | "operations"
  | "imports";

export const ADMIN_IDENTITIES = [
  {
    id: "DEMO-ADMIN-001",
    name: "Sample System Administrator",
    office: "Municipal ICT",
    assignment: "Platform administration",
    state: "Active demo assignment",
    requestedChange: "Leaver simulation · deactivate access",
    requester: "DEMO-OWNER-001",
    reviewer: "DEMO-DPO-001",
    history: ["Joined Municipal ICT sample scope", "Last access review completed 01 Sep"],
  },
  {
    id: "DEMO-OWNER-001",
    name: "Sample Office Owner",
    office: "BPLO",
    assignment: "Configuration reviewer",
    state: "Pending owner review",
    requestedChange: "Mover simulation · BPLO reviewer to Treasury observer",
    requester: "DEMO-ADMIN-001",
    reviewer: "DEMO-DPO-001",
    history: ["Assignment change requested 16 Sep"],
  },
  {
    id: "DEMO-DPO-001",
    name: "Sample Privacy Reviewer",
    office: "DPO",
    assignment: "Privacy and audit projection",
    state: "Active demo assignment",
    requestedChange: "Periodic access review",
    requester: "DEMO-DPO-001",
    reviewer: "DEMO-DPO-001",
    history: ["Joined DPO sample scope", "Self-approval conflict fixture attached"],
  },
] as const;

export const ACCESS_ROWS = [
  {
    capability: "Resident registry summary",
    municipal: "Assigned office",
    barangay: "Own barangay",
    partner: "None",
    purpose: "Service delivery",
  },
  {
    capability: "M10 restricted narratives",
    municipal: "None by default",
    barangay: "None",
    partner: "None",
    purpose: "Separate case assignment required",
  },
  {
    capability: "Public content publishing",
    municipal: "Editorial role",
    barangay: "Draft submission",
    partner: "None",
    purpose: "Public information",
  },
] as const;

export const ACCESS_REVIEW_TASKS = [
  {
    id: "DEMO-ACC-001",
    account: "DEMO-OWNER-001",
    role: "Treasury observer",
    scope: "M06 reconciliation summary",
    fields: "Reference, amount, state; no payer detail",
    purpose: "Monthly reconciliation review",
    validUntil: "2026-10-31",
    requester: "DEMO-ADMIN-001",
    reviewer: "DEMO-DPO-001",
    state: "Requested",
    history: ["Requested with purpose and validity"],
  },
  {
    id: "DEMO-ACC-002",
    account: "DEMO-ADMIN-001",
    role: "Restricted case reader",
    scope: "M10 protection narratives",
    fields: "Narrative and protected attachments",
    purpose: "Generic system administration",
    validUntil: "2026-09-30",
    requester: "DEMO-ADMIN-001",
    reviewer: "DEMO-ADMIN-001",
    state: "Self-approval conflict",
    history: ["Blocked because requester and reviewer are the same persona"],
  },
  {
    id: "DEMO-ACC-003",
    account: "DEMO-DELEGATE-001",
    role: "Document delegate",
    scope: "M05 assigned signatory tasks",
    fields: "Task summary and exact approved version",
    purpose: "Time-bound delegated sign-off",
    validUntil: "2026-09-14",
    requester: "DEMO-OWNER-001",
    reviewer: "DEMO-DPO-001",
    state: "Expired",
    history: ["Validity ended before the demo clock"],
  },
] as const;

export const CONFIG_VERSIONS = [
  {
    id: "DEMO-CFG-001",
    name: "Business renewal form",
    current: "v2 · effective 01 Jul",
    proposed: "v3 · effective 01 Oct",
    impact: "New applications only; issued permits retain v2",
    effectiveDate: "2026-10-01",
    state: "Draft",
    valid: true,
    history: ["Draft v3 proposed"],
  },
  {
    id: "DEMO-CFG-002",
    name: "Barangay clearance template",
    current: "v4 · current",
    proposed: "v5 · validation pending",
    impact: "Three sample templates require preview",
    effectiveDate: "2026-09-20",
    state: "Draft",
    valid: false,
    history: ["Draft v5 proposed", "Validation found a missing signatory reference"],
  },
  {
    id: "DEMO-CFG-003",
    name: "Treasury sample fee schedule",
    current: "v7 · current assessment rule",
    proposed: "v8 · future effective date",
    impact: "New M06 assessments only; existing assessments, receipts, and issued permits retain v7",
    effectiveDate: "2026-10-01",
    state: "Draft",
    valid: true,
    history: ["Draft v8 proposed with sample fee values"],
  },
  {
    id: "DEMO-CFG-004",
    name: "Document signatory delegation",
    current: "Primary signatory · active",
    proposed: "Sample delegate · 20–22 Sep 2026 only",
    impact: "M05 tasks assigned during the validity window only; actor and delegation history remain visible",
    effectiveDate: "2026-09-20",
    state: "Draft",
    valid: true,
    history: ["Delegation draft created", "Validity window recorded"],
  },
  {
    id: "DEMO-CFG-005",
    name: "Assistance intake workflow",
    current: "v3 · current",
    proposed: "v4 · drafted from stale v2",
    impact: "Activation blocked until the proposal is rebased on current v3",
    effectiveDate: "2026-09-20",
    state: "Outdated version conflict",
    valid: false,
    history: ["Stale base version detected", "Activation blocked"],
  },
] as const;

export const AUDIT_EVENTS = [
  {
    id: "DEMO-AUD-001",
    time: "16 Sep · 09:12",
    actor: "DEMO-OWNER-001",
    action: "Reviewed configuration proposal",
    record: "DEMO-CFG-001",
    purpose: "Configuration review",
    version: "DEMO-CFG-001 v3 draft",
    reason: "Dependency and effective-date review",
  },
  {
    id: "DEMO-AUD-002",
    time: "16 Sep · 08:44",
    actor: "DEMO-DPO-001",
    action: "Viewed redacted access event",
    record: "Restricted reference hidden",
    purpose: "Privacy review",
    version: "Redacted projection v1",
    reason: "Assigned quarterly access review",
  },
  {
    id: "DEMO-AUD-003",
    time: "15 Sep · 16:20",
    actor: "DEMO-ADMIN-001",
    action: "Replayed local provider failure",
    record: "DEMO-INT-001",
    purpose: "Demo recovery exercise",
    version: "Failure fixture v2",
    reason: "Presenter-triggered replay",
  },
] as const;

export const PRIVACY_TASKS = [
  {
    id: "DEMO-PRV-001",
    title: "Correction request review",
    detail: "Verify requester context before routing",
    state: "Assigned",
    hold: false,
    history: ["Correction request received", "Identity-context check assigned"],
  },
  {
    id: "DEMO-PRV-002",
    title: "Retention disposition preview",
    detail: "Legal hold DEMO-HOLD-001 blocks the candidate",
    state: "Blocked by hold",
    hold: true,
    history: ["Retention candidate identified", "DEMO-HOLD-001 applied"],
  },
  {
    id: "DEMO-PRV-003",
    title: "Purpose register review",
    detail: "Assistance eligibility projection",
    state: "Due 30 Sep",
    hold: false,
    history: ["Purpose register review scheduled"],
  },
] as const;

export const OUTBOX_ITEMS = [
  {
    id: "DEMO-MSG-001",
    direction: "Outbox",
    channel: "SMS",
    recipient: "09•• ••• ••01",
    purpose: "Sample request update",
    state: "Pending locally",
    attempts: 0,
    correlationId: "DEMO-COR-001",
    cost: "PHP 0.00 local preview",
    history: ["Queued locally; provider not contacted"],
  },
  {
    id: "DEMO-MSG-002",
    direction: "Outbox",
    channel: "Email",
    recipient: "s•••@example.invalid",
    purpose: "Sample receipt notice",
    state: "Provider failure",
    attempts: 2,
    correlationId: "DEMO-COR-002",
    cost: "PHP 0.00 local preview",
    history: ["Attempt 1 failed locally", "Attempt 2 failed locally"],
  },
  {
    id: "DEMO-MSG-003",
    direction: "Inbox preview",
    channel: "Push",
    recipient: "Member inbox",
    purpose: "Sample appointment reminder",
    state: "Delivered local preview",
    attempts: 1,
    correlationId: "DEMO-COR-003",
    cost: "PHP 0.00 local preview",
    history: ["Rendered in the local member inbox only"],
  },
] as const;

export const INTEGRATIONS = [
  {
    id: "DEMO-INT-001",
    name: "Payment provider",
    owner: "Treasury",
    purpose: "Confirm payment event",
    status: "Failure injected",
    credential: "demo_••••_invalid",
    correlationId: "DEMO-INT-COR-001",
    history: ["Provider failure injected", "M06 collection remains unconfirmed"],
  },
  {
    id: "DEMO-INT-002",
    name: "PCG document handoff",
    owner: "Tourism",
    purpose: "Required document projection",
    status: "Local simulation ready",
    credential: "No credential stored",
    correlationId: "DEMO-INT-COR-002",
    history: ["Minimum document projection prepared locally"],
  },
  {
    id: "DEMO-INT-003",
    name: "Notification provider",
    owner: "Municipal ICT",
    purpose: "Send opted-in service updates",
    status: "Retryable",
    credential: "demo_••••_invalid",
    correlationId: "DEMO-INT-COR-003",
    history: ["Retryable notification failure recorded"],
  },
] as const;

export const OPERATIONS_ITEMS = [
  {
    id: "DEMO-OPS-005",
    name: "Prototype uptime status",
    detail: "Local renderer and fixture repository · no production monitoring claim",
    state: "Simulated healthy",
    history: ["Presenter status snapshot generated locally"],
  },
  {
    id: "DEMO-OPS-004",
    name: "Sample notification incident",
    detail: "Owner: Municipal ICT · provider errors only; no service authority changed",
    state: "Assigned",
    history: ["Incident opened from repeated local provider failures"],
  },
  {
    id: "DEMO-OPS-001",
    name: "Local recovery exercise",
    detail: "Fixture snapshot · 15 Sep 22:00",
    state: "Ready to simulate",
    history: ["Fixture snapshot verified for local walkthrough"],
  },
  {
    id: "DEMO-OPS-002",
    name: "Assigned mobile devices",
    detail: "6 devices · 1 stale sync",
    state: "Attention",
    history: ["Device DEMO-DEV-006 marked stale"],
  },
  {
    id: "DEMO-OPS-003",
    name: "Offline queues",
    detail: "3 local drafts · no production upload",
    state: "Local only",
    history: ["Three sample drafts retained on devices"],
  },
] as const;

export const IMPORT_ROWS = [
  { row: 1, source: "DEMO-IMPORT-001", target: "Resident registry", finding: "Ready", decision: "Include" },
  {
    row: 2,
    source: "DEMO-IMPORT-001",
    target: "Resident registry",
    finding: "Possible duplicate DEMO-PER-001",
    decision: "Human review",
  },
  {
    row: 3,
    source: "DEMO-IMPORT-001",
    target: "Resident registry",
    finding: "Invalid birth date",
    decision: "Exclude",
  },
] as const;
