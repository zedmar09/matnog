# Initial web foundation — validation

First validated 15 September 2026 and revalidated 16 September 2026 after M06.07,
on macOS using Node.js 22.22.2 and Chromium through Playwright 1.60.0.

## Automated checks

| Check | Result |
|---|---|
| Next.js optimized production build | Passed; 47 generated pages, including all seven M06 routes, all seven M05 routes, eight service-draft handoff routes, the M02 account/ID routes, all seven M01 routes and eight service detail routes |
| TypeScript strict check | Passed |
| Biome source and browser-script checks | Passed |
| Unit tests (`node --test`) | 169 passed across the shared data layer, M01 registry rules/selectors, M02 account/ID rules, M05 routing/custody rules, and M06 money-state, ledger, selectable-scenario, source-gate and M14 posting adapters |
| Browser workflow checks | 24 groups passed, including M06 selectable payer scenarios, payer checkout, source-module payment gates, cashier collections, staff receipt history, settlement correction, M14 posting readiness and adjustment separation of duties |
| Automated accessibility | 92 scans passed; no violations in the selected WCAG A/AA rule sets |
| Runtime errors and external calls | No uncaught browser errors or external service requests during the workflow run |

The final 16 September run repeated every check after M06.07. It exercised the
in-memory citizen challenge, authentication exceptions, recovery, separate staff MFA,
resident-link confirmation, no-match/duplicate/shared-contact previews, requester selection, delegated expiry, service-intent retention, visitor/resident eligibility, local preferences/session summary, session expiry,
municipal ID correction/issuance/replacement/invalidation, stale offline verification, M01 role/scenario controls,
the M05 document/version/route/custody split, seven S11 variants, role-projected search, validated
registration, replacement and revision preview, filtered task queues, stage assignment,
acknowledgment, reasoned return/endorsement, custody acceptance and dispute, approved-revision
release, archive holds, routing-template versioning, privacy-safe document tracking, selectable M05 states, payer-scoped assessments, selectable S10 scenarios, item disclosure, local checkout, M03/M04/M07 payment-gate ownership, uncertain-result recheck, confirmed collection, watermarked payer and staff receipt history, atomic cashier posting, daily/session totals, collection filters, linked financial history, settlement correction, M14 posting readiness, second-persona adjustment review, and representative routes
at five viewport widths.

The test scripts run against an already-running local preview. Reproduce with `npm run build`, `npm start`, then `npm run test:browser` and `npm run test:a11y` in another terminal. Chromium must be installed through Playwright.

## Browser coverage

1. Landing page, green primary, image decoding, and keyboard skip link.
2. Hero search, audience filters, service detail navigation, no-result state, and reset.
3. Request reference validation, certificate timeline, unknown reference, and normalized business reference.
4. Invalid mobile input; SMS unavailable; rate limiting; expired challenge; immediate replacement challenge; retained phone on correction; incorrect OTP; normal resend cooldown; timed expiry; successful visitor entry; retained M03 service intent; visitor status; and requester handoff.
5. M06 payer records and the S10 scenario selector are scoped to the active requester; assessment detail discloses the item basis and payee; the M03/M04/M07 handoff reports payment state while leaving issuance, release and departure decisions with the source module; checkout asks for no financial credential; pending and failed attempts show no receipt; recheck creates one collection and one watermarked sample receipt; the service return context remains available.
6. Resident matching can show no candidate, multiple possible people, or a shared contact number without automatic linking. Normal linking stays disabled until self-record confirmation, repeats the selected M01 projection in a review dialog, and exposes the pending reference/owner without granting access. Requester selection names Demo Bay Tours, confirms the service handoff, expires the authority, removes it from the selector and falls back to Mara before session-expiry cleanup.
7. Recovery validation and local review receipt; separate staff credential and MFA validation; successful staff workspace handoff; and confirmation that entered phone, recovery and staff values never enter browser storage.
8. Municipal ID review blocks enrollment before resident-link approval, requires reasons for correction and replacement, returns a correction to the wallet, issues a sample card after resubmission, retains the person ID across replacement, invalidates the old token, keeps the public result free of resident, household and address data, and marks an offline cached result stale.
9. Staff module catalog, M10 scope information, partner-only navigation projection, error/retry, empty/reset, and search reset.
10. The demo clock shows the fixed epoch, advances by one and seven days, and resets both on its own control and through "Reset demo".
11. Registry directory scope, verification filter, filtered-empty recovery, and person detail tabs.
12. Registry scope per persona: barangay staff never see an out-of-scope person, a direct URL returns a generic permission state that does not name the hidden record, and the tourism partner gets no registry at all.
13. Selectable registry permission and slow-response states, including recovery back to the normal fixture projection.
14. Household directory, the verification-overdue filter, a shared structure with separate counts, a retained closed membership, and "unknown" shown distinctly from "no".
15. **S01 acceptance walkthrough**: release, accept, then confirm the person ID is unchanged and both the closed Barangay A period and the new Barangay B period are visible.
16. Duplicate review refuses a short reason, records a merge, and reverses it with the original reason retained.
17. Registration refuses a future birth date, preserves entries across a step back, surfaces the existing person during the duplicate precheck, and creates an unverified draft whose history records the matches reviewed.
18. Survey assignments show progress and an overdue assignment, a stale draft compares base, field and stored values per field, and the import preview keeps the apply action disabled while any row needs a decision.
19. M05 role-projected register, validated registration, detail preview, revision replacement and selection, filtered routing inbox, stage assignment, acknowledgment, reasoned return and endorsement; exact-reference custody acceptance and reasoned dispute; approved-revision release receipt; archive preview and hold clearing; parallel completion and expired-delegation blocking; local routing-template versioning; privacy-safe tracking; and custody retained by the sender while handover is pending.
20. M05 empty, error, denied and slow states are selectable. Denied detail exposes no restricted metadata, and retry/restore returns to normal sample records.
21. M06 cashier lookup blocks an unresolved online attempt, posts one fictional cash collection after explicit review, updates demo-day/session totals, filters the register to the cashier channel, and exposes the linked six-layer financial history. The staff receipt route keeps assessment, attempt, acknowledgment, collection, receipt, settlement and adjustments distinct.
22. M06 reconciliation assigns the PHP 20.00 difference, holds the linked M14 projection, refuses a correction that does not equal net, then marks the projection ready for M14 mapping review only after exact reconciliation. It preserves the previous bank value, blocks requester self-approval, completes a valid second-persona refund without changing collection amounts, and blocks a PHP 850.00 request above the PHP 800.00 limit.
23. Representative public, citizen, staff, M01, M02, all seven M06 routes and all seven M05 routes at 1440, 1024, 768, 390, and 360 CSS pixels with no page-level horizontal overflow. Public mobile navigation and staff sidebar both close after selection.
24. Linked public destinations return successful responses. Unknown service slugs return HTTP 404 with the custom recovery page.

Unit tests cover the shared data layer directly: envelope normalisation, list
search/filter/paging, atomic transitions, version conflicts, replayed-event
idempotency, validation failures leaving no history, scenario outcomes, sample
export watermarking, and reset restoring the seed. Run them with
`npm run test:unit`; they use Node's own test runner and type stripping, with a
small resolver hook in `scripts/ts-hooks.mjs` for this project's import style.

The workflow run uses safe fictional fixtures only. Phone and code challenges,
recovery fields and staff credentials do not appear in local storage or URLs. The
persisted fictional citizen marker is removed on sign-out and simulated session expiry.

## Accessibility and visual review

- Axe scans: forty-two routes at both desktop and phone widths, plus OTP, signed-in account, four signed-in M06 payer states, request timeline, and module dialog states.
- Improved secondary text contrast on white and light-green surfaces. Registry tab labels were darkened after a scan measured the default muted tone at 3.67:1 on the tab strip.
- Checked explicit labels, error messages, status text, focusable controls, semantic landmarks, and skip navigation.
- The M14 preview exposed a phone-width horizontal table with no focus target; the shared table wrapper is now a named, keyboard-reachable region.
- Dialog animation completion is awaited before automated scanning.
- Visually reviewed desktop and phone landing pages, the staff workspace, and the signed-in account.
- The final image review exposed an external-volume image-cache issue; local photos now bypass that cache. Browser checks explicitly decode images to catch load failures.
- Screenshots are in the ignored `test-results/` directory. Test paths use fileURLToPath so workspace paths containing spaces work correctly.

Automated scans do not establish full WCAG conformance. Screen-reader evaluation, additional browser/device coverage, text zoom, official content review, and user testing remain before a public release.

## Scope carried forward

This delivery includes the WebApp foundation and the complete M01–M02/M05–M06 frontend prototypes,
including M06 payer checkout, selectable scenarios, web cashier/reconciliation workspaces, staff receipt history, adjustment review and local source/posting adapters: account, authentication, representation, municipal credential, exception,
service-handoff and local payment-result states. The remaining M03–M04 and M07–M17 workflows,
production authorization, real payments, real SMS, PCG/government
integrations, and the remaining S02–S12 scenario mutations remain unimplemented. The
staff catalog entries outside M01/M02/M05/M06 contain module scope metadata, not working
operational records.

M01 implements all seven web screens: residents directory, registration wizard, person detail,
households directory, household detail, review queues and survey assignments. Minimal person and
household selectors support dependent modules without exposing the registry record. Registry
changes live in memory for one application instance: a hard page reload restores the seeded
fixtures.

Also still open from the shared foundation plan: the wider citizen/business shell, a separate partner workspace, the advisories and approved-projects public routes,
connectivity/event-replay preview controls, and broader offline states. `ContextSwitcher` and
`FormSection` exists as a shared component but has no consumer yet.

The Flutter foundation, M01–M02/M05 screens and M06 payer/exception journeys are implemented and validated
separately; see the MobileApp README and the mobile foundation plan. Department extensions E01–E11
remain presentation-only. No site deployment or production account configuration was performed.
