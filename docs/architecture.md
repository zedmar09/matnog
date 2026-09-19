# Web F0 architecture decisions

Date: 15 September 2026.

## User-authorized direction

Start WebApp first, using the supplied Next/shadcn admin template and the enterprise-fe-architect skill. Use green success as the primary brand color. Continue the approved frontend-only scope. MobileApp targets Flutter Android/iOS and now has its own implemented foundation.

## Template adaptation

The template already provides Next.js App Router, React, TypeScript, shadcn, Tailwind, Refine, TanStack Query, RHF, Zod, and Biome. Its package lock and MIT license were retained. Its UI primitives were moved into shared/components/ui and internal imports were updated.

Excluded template examples, demo charts, generated output, node_modules, external fake REST provider, and demo server actions. Dependencies were installed independently from the lock. Next routes now delegate to municipal feature views.

The public landing page establishes the civic design; the operations shell uses the template's Sidebar, Dialog, Skeleton, Button, and other primitives. The default primary is green success (#15803d), with dark forest headings and light neutral surfaces. No official seal or unverified mayor name is used.

## Shared component library

`src/shared/components/ui` holds unmodified shadcn primitives. `src/shared/components` holds the
municipal patterns named in the shared foundation plan, so a feature composes them instead of
repeating markup and ARIA wiring:

| Component | Responsibility |
|---|---|
| `PageHeader` | Breadcrumb, page title and supporting sentence. |
| `SectionHeading` | Eyebrow, section title and supporting sentence inside a page. |
| `ContentPanel`, `PanelDivider` | Shared bordered surface and its internal rule. |
| `NoticePanel` | Disclosure that content is illustrative or an action is simulated. |
| `StatusBadge`, `ScopeBadge` | Status and applicable-scope labels; both always render text. |
| `EmptyState`, `ErrorState`, `LoadingState`, `PermissionState` | The four non-content states. |
| `DataTable` | Operational table with scoped headers and a live result summary. |
| `SearchField`, `FilterTabs`, `ResultsSummary`, `FilterBar` | Browsing and filtering controls. |
| `RecordCard` | One-record summary for card layouts. |
| `Timeline` | Request progress with an icon per step, not colour alone. |
| `FormField`, `FormSection`, `ErrorSummary` | Label/error/hint wiring, field grouping, and a focusable summary of validation failures. |
| `ConfirmationDialog` | Explicit confirmation for a consequential local action. |
| `ContextSwitcher` | Acting context: self, represented household, or represented business. |
| `ScenarioPanel` | Demo persona and sample-state selection, kept out of service journeys. |

`FormField` renders its control through a function so the `aria-describedby` target always matches
the message actually on screen. `ErrorSummary` takes focus when it appears and links each entry to
its field.

Components named in the plan but owned by a later module are deliberately absent:
`AttachmentPanel` (M05), `ReviewPanel` (M05/M07), `MoneyBreakdown` (M06), `DocumentPreview` (M07),
`MapWithList` (M15), `NotificationInbox` (M17), `OfflineBanner` and `SyncQueue` (M09). Build each
one with its first real consumer rather than guessing its contract now.

## Shared local data layer

`src/shared/data` holds the record envelope, the operation contract and the demo
clock defined in the mock-data plan. Every module's repository builds on it, so
the envelope, versioning, history and selectable outcomes are defined once
rather than per module.

| File | Responsibility |
|---|---|
| `record-envelope.ts` | `RecordEnvelope` (id, reference, status, version, scope, timestamps, source), `RecordScope`, `HistoryEntry`, `SampleAttachment` |
| `repository-result.ts` | `success`, `empty`, `invalid`, `denied`, `conflict`, `failure` |
| `local-repository.ts` | `list`, `read`, `saveDraft`, `submit`, `requestCorrection`, `recordDecision`, `appendTimeline`, `exportSampleView`, `history`, `reset` |
| `in-memory-repository.ts` | Generic implementation over bundled fixtures |
| `demo-clock.ts` | Fixed, advanceable "today" plus Asia/Manila formatting |

Decisions worth keeping:

- **Scope is a kind plus a value.** A barangay name alone is not a scope, because
  the same label can apply to a person, a household and an office record that
  must not be treated alike.
- **Transitions are atomic.** The record, its version and its history entry are
  written together, or nothing is written. A failed validation leaves no history.
- **Version pinning is opt-in.** Pass `expectedVersion` and a stale write is
  refused with the current version, instead of silently overwriting.
- **Replayed events are idempotent.** An `eventId` is recorded once, so a
  repeated simulated payment or scan cannot produce a second outcome. This is a
  single-instance guarantee; no cross-device deduplication is claimed.
- **Fixtures are never mutated.** The seed is cloned on construction and on
  every `reset`, so a scenario replay always starts from the documented state.
- **Nothing reads the real date.** `demoClock` starts at a fixed Asia/Manila
  epoch and only moves through the scenario controls, so expiry and overdue
  states are reproducible. The staff workspace exposes the control, and
  "Reset demo" resets the clock with everything else.

`InMemoryRepository` also carries latency and the selectable non-success states,
so a screen can demonstrate slow, empty, error, denied and conflict outcomes
without each module re-implementing them.

## Boundaries between features

- Public information composes service-directory cards; the service-directory owns its catalog.
- The account imports a safe public request projection from request-tracking. There is one source for the two request fixtures.
- The shared session stores only a fixed sample identity marker. A separate memory-only auth provider carries a phone challenge between the phone and verification routes; it is cleared after success or a browser refresh.
- The operations catalog contains plan metadata, not personal records. Its provider rejects mutation operations.
- Refine owns the resource query lifecycle. A role change replaces the Refine tree, resets filters, and closes dialogs. Query keys include persona and preview scenario.
- The M10 entry contains general module scope only, with explicit assigned-personnel labeling. Municipal staff selection does not expose a case.
- Future operational role enforcement belongs to later backend scope; browser filtering is a UI demonstration only.

## M02 account entry boundary

The citizen session is a fixed fictional `DEMO-VIS-001` account with phone-verification
state and an optional resident association. The derived states are visitor,
resident-link pending and verified resident. A phone-verified account can open the
profile but cannot open a resident-only surface until its association is `linked`.

Citizen and staff access remain separate. The citizen session has no staff state and
cannot grant access to the scoped `/ops` workspace. `/account/profile` is the canonical
citizen route; `/account` remains a compatibility redirect. Post-sign-in navigation
accepts only allowlisted citizen paths, rejects external and staff destinations, and
preserves a validated service slug on the profile.

The phone and verification screens share a deterministic in-memory challenge. Only an
allowlisted service or citizen return path enters the URL; the phone and code never do.
Normal, unavailable-SMS, rate-limited and expired-code outcomes are selectable fixture
states. Resend increments the displayed challenge generation and keeps the phone in
memory. Recovery form values and staff credential/MFA values are component-local and
are not persisted. The staff flow remains separate from the citizen session and links
to `/ops` only after its own local two-step demonstration.

These controls model screen behavior rather than security. There is no authentication
server, identity provider, SMS delivery, recovery operation, staff directory or access
token. Refresh clears the active challenge; the fixed citizen marker exists only to
demonstrate reload and session-expiry behavior.

## M02 resident-link and requester context boundary

The account, resident association and requester context are separate values. A link
request persists only its fixed fictional reference and pending state with the demo
session. It records who is expected to review it but cannot approve itself or expose
the full M01 person record. The selector consumes only the minimal M01 person
projection already defined for dependent modules.

Representation fixtures carry a subject ID/type, authority label, explicit scopes and
validity dates. The selector derives its options from currently valid records and never
infers authority from a shared household. Switching to a person or business requires a
named confirmation. The handoff preview repeats the subject and ID before recording a
local confirmation.

Requester selection and the forced-expiry scenario live in `DemoRequesterProvider`, so
the profile and service-draft handoff routes use the same active subject during the
current application instance. If delegated authority expires, the context resolver
removes it from the available set and falls back to the signed-in account owner. Sign
out also resets the context. This is a UI safety rule for the prototype, not a
production authorization mechanism or durable delegation store.

## M02 service-draft handoff boundary

`/services/:slug/start` is a generic M02 handoff surface for M03, M04, M07 and M11. A
validated service slug survives phone and OTP navigation. The surface repeats the
account status, requester name, stable subject ID and authority before recording a
deterministic local draft-intent receipt. The future owning module still collects its
own form and workflow details.

Eligibility rules are pure feature services. M03 accepts the account owner or a named
business context; M04 accepts self, person or business; M07 accepts self or person but
requires an approved resident association for the owner's own request; M11 accepts all
currently modeled requester kinds. Thus a phone-verified visitor is visible as such and
is never silently promoted to a verified resident. No handoff submits a request or
creates an M03/M04/M07/M11 operational record.

## M02 municipal credential boundary

`DemoIdentityProvider` owns the fictional resident-link review, enrollment application
and credential lifecycle at the application root. This gives `/account/id`,
`/ops/identity/applications` and `/verify/id/:token` one consistent state while the user
navigates between citizen, staff and public layouts. The provider is memory-only and a
browser refresh reconstructs the seed. It is separate from the stored demo session;
approving the resident link updates the session's association marker but does not turn
phone verification into identity proof.

Municipal credential transitions are pure feature services. They require resident-link
approval before enrollment approval, require meaningful reasons for correction,
rejection, replacement and revocation, and retain the person ID across replacement.
Replacement marks the predecessor superseded before activating the next credential.
The public verifier consumes a dedicated `PublicCredentialResult`, which can return
reference, credential type, validity, status, issue/expiry dates and a safe message but
has no name, person, household or address fields.

The sample card, image, print view, review decisions and verification result are UI
artifacts. There is no database, server mutation, trusted signature, QR scanner,
government identity connection or production access control behind them.

## Extension points

1. Replace each generic handoff receipt with its owning module's local draft when M03, M04, M07 or M11 is implemented.
2. Add central notification, attachment, and workflow patterns when the first owning module actually needs them; the table, form, state and filter patterns already exist in `shared/components`.
3. Add module fixtures and repositories on top of `shared/data`; do not re-implement envelopes, results or clocks per module.
4. Keep the completed Flutter M02 implementation aligned through token values, labels, stable DEMO IDs and transition rules. Do not share TypeScript/DOM code with Flutter.

## Current tradeoffs

- F0 supports a small public catalog; advanced directory management belongs to M16.
- Public tracking returns two safe sample timelines. No reference authenticates access to personal data.
- Staff personas demonstrate navigation scope; no operational role enrollment exists.
- Other F0 items listed in the broader plan (citizen/business context shell, partner task shell, rich attachments, notifications, draft recovery, conflict/offline simulation, and the wider scenario controls in the mock-data plan) remain for the stages that consume them.
- English is implemented first; translated copy must be reviewed before adding a working language selector.
- No deployment or third-party service configuration is included.

### Local image delivery

The external macOS workspace volume automatically creates AppleDouble metadata files. Next’s built-in image cache was observed reading these files as image payloads. Image optimization is disabled for this prototype so photos load directly from public/images. The original licensed photograph is retained; prepare optimized static image variants before production delivery.
