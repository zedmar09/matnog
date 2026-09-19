# Digital Matnog — WebApp

Initial web foundation for the LGU Matnog UI/UX prototype, built from the supplied **next-shadcn-admin-dashboard-main** template.

## Run locally

Use Node.js 22 (the project includes `.nvmrc`).

```bash
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. For a production-mode preview: `npm run build`, then `npm start`.

## Available now

- Public landing page with Matnog photography, service search, audience filters, updates, and tourism entry.
- Service directory and eight illustrative service guides.
- Destination, help, privacy, accessibility information, and attribution pages.
- Demo phone / OTP entry with normal, unavailable-SMS, rate-limit, expired-code, resend and session-expiry states.
- Local-only citizen recovery and a separate staff credential/MFA demonstration.
- Canonical `/account/profile` with explicit visitor, pending-link, resident, credential and staff-access boundaries.
- Named person/business requester contexts with scoped authority, confirmation, expiry fallback and no implicit household access.
- M03/M04/M07/M11 service-draft handoffs that preserve service intent through sign-in, carry the named requester, and keep visitor and resident eligibility distinct.
- Detailed fictional resident-link review reference, owner and progress without automatic resident approval.
- Selectable resident-match previews for no match, multiple candidates and a shared contact number, all without automatic linking.
- Local language/reading/reminder preferences and a current-session summary with no claimed device management.
- Citizen municipal ID wallet with a gated application, evidence status, correction/resubmission, sample card, print preview, replacement request and history.
- Staff identity review with separate resident-link and enrollment decisions, reasoned corrections, issuance, replacement and revocation.
- Privacy-safe public credential verification that exposes validity metadata without resident, address or household details.
- A stale offline credential preview that requires reconnection and cannot expose the restricted holder match.
- Sample request tracking with validation, loading, found, and not-found states.
- Staff shell with responsive sidebar, role selection, scoped M01–M17 module catalog, module scope dialogs, search, reset, and empty/error demonstrations.
- All seven M01 registry screens: resident registration and detail, household records, duplicate/transfer review, survey assignments and conflict handling.
- Minimal M01 person/household selectors and a pending M02 resident-link review after phone verification.
- M03.01 business-permit journey foundations for all seven planned routes: represented businesses, four-path application map, applicant-safe tracker, municipal queue/review gates, and a business map with a list equivalent.
- Complete M05.01–M05.07 document-routing prototype with register, validated registration, revision preview/replacement, routing decisions, template version editor, physical custody acceptance/disputes, approved-version release, archive holds, safe public tracking, and selectable exception states.
- Complete M06.01–M06.07 payment/Treasury prototype with separate financial contracts, integer-centavo math, nine selectable ledger variants including a source-issued assessment, scoped assessments, itemized local checkout, atomic sample cash posting, settlement and adjustment review, staff receipt history, M03/M04/M07 payment gates, and a read-only M14 posting preview.
- Complete M07.01–M07.07 certificate journey with typed request, template, issuance and verification fixtures; functional request/correction, barangay review, M06-owned fee state, M05 output routing, M03 business-clearance projection, M10 case-origin validation, controlled sample sign-off and release, same-serial reprint, revocation, applicant tracking, public validity updates, queue filters and selectable lifecycle/repository exception states.
- M03–M04 requirements coverage for business licensing and tourism/maritime journeys, including application decisions, visitor booking, partner document review, trip operations, boarding, return, and advisories.
- M08–M11 requirements coverage for sectoral assistance, disaster exercises, restricted cases, citizen requests, appointments, counter operations, and safe public or aggregate projections.
- M12–M14 requirements coverage for development proposals, plan prioritization, project/procurement execution, inspections, billings, budgets, obligations, releases, periods, and mock interfaces.
- M15–M17 requirements coverage for municipal insights, map/list alternatives, reports, data quality, public publications, editorial control, access/configuration, privacy, audit, notifications, integrations, operations, imports, and presenter scenarios.

The **requirements-first WebApp now represents all 125 planned M01–M17 routes** with fictional local data, role-scoped projections, and representative UI transitions. This is still a frontend demo: no backend, production authorization, external message, payment, PCG, government portal, publication, or recovery service is connected. The next phase is UI/UX improvement, followed by one consolidated validation pass.

## Try the demo

| Journey | Input / action |
|---|---|
| Citizen entry | Choose **Use demo number: 09170000000**, then code **123456** |
| Authentication exceptions | On `/auth/phone`, select SMS unavailable, rate limited or expired code |
| Citizen recovery | Open `/auth/recover`; demo submission changes no account or phone |
| Requester contexts | Sign in, then choose Nico Dela Cruz or Demo Bay Tours under **Acting for** |
| Service draft handoff | Open M03, M04, M07, or M11 from the service directory, sign in, confirm the requester, and record a local draft intent |
| Business application paths | Sign in, open `/businesses`, then review new, renewal, amendment and closure from the represented-business record |
| BPLO review map | As Municipal staff, open `/ops/bpls/applications`, choose any path example, then inspect independent review, inspection, clearance, payment and decision gates |
| Authority expiry | Select a delegated context, then choose **Preview authority expiry** |
| Resident matching exceptions | On the profile, choose no match, multiple matches, or shared contact under **Resident matching preview** |
| Staff sign-in | Use **demo.staff** / **STAFF2026**, then MFA code **654321** |
| Municipal ID lifecycle | Submit the resident link from `/account/profile`, approve the link and enrollment in `/ops/identity/applications`, then open `/account/id` |
| Public ID result | From the staff credential history, open **Public result** for an active, superseded or revoked sample credential |
| Offline ID result | On a public verification result, choose **Offline cached result**; it is marked stale and cannot establish current validity |
| Certificate tracking | `DEMO-CERT-001` |
| Certificate draft recovery | Sign in as the linked resident, open `/certificates/new`, enter partial fictional details, and choose **Save draft** |
| Returned certificate correction | Choose Nico Dela Cruz under **Acting for**, open `/certificates/new`, then open `DEMO-CERT-002` from **Existing fictional requests** |
| Certificate lifecycle | Submit a new linked-resident request, sign in as Barangay staff, approve it, record an exemption, then confirm the sample sign-off and release |
| Reprint and revocation | As Barangay staff, open `DEMO-CERT-003`; record a same-serial reprint or revoke it, then open its public validity result |
| Certificate queue states | Open `/ops/certificates/requests`; combine search/type/status/date filters or choose loading, empty and recoverable-failure previews |
| Certificate decision exceptions | Open a certificate staff record and choose stale version, unavailable signatory, missing template or serial conflict under **Decision exception preview** |
| Business tracking | `DEMO-BPL-001` |
| Unknown reference | `DEMO-UNKNOWN` |
| Staff workspace | Open `/ops`; change persona and preview state |
| Routing template editor | Open `/ops/routing/templates` as Municipal staff |
| Safe document tracking | Open `/track/documents/DOC-2026-0048`; restricted and unknown references return the same unavailable state |
| Payer checkout | Sign in, open `/payments`, review `DEMO-ASM-003`, choose a sample channel, then recheck the pending attempt to create a watermarked receipt |
| Payment scenarios | On `/payments`, choose any fixture available to the current payer under **Scenario walkthrough** and open its assessment, attempt, or receipt |
| Cashier collections | As Municipal staff, open `/ops/treasury/collections`, look up `DEMO-ASM-003`, review the generated event, and post the fictional PHP 2,000.00 collection |
| Staff receipt history | Open `/ops/treasury/receipts/DEMO-RCP-008` to inspect the separate assessment, attempt, acknowledgment, collection, receipt and settlement records |
| Treasury reconciliation | Open `/ops/treasury/reconciliation`, assign `DEMO-SET-008`, then correct the fictional bank evidence from PHP 1,095.00 to the PHP 1,075.00 expected net |
| Adjustment separation of duties | Open `/ops/treasury/adjustments/DEMO-ADJ-001-1`; the requester cannot self-approve, while the sample Treasury reviewer can complete the local review without changing collection amounts |
| Reset | Staff **Reset demo**, or citizen **Sign out** |

The normal demo code expires after five minutes and can be regenerated after 30 seconds; the expired-code scenario makes resend available immediately. The active phone challenge stays only in memory while moving between the phone and verification routes. Requester selection and forced expiry live in one root-level M02 provider for the current application instance; draft receipts remain local to their handoff page. Municipal identity decisions use a separate root-level in-memory fixture store so the citizen, staff and public screens agree while navigating; a browser refresh restores both seeds. Phone numbers, codes, recovery fields and staff credentials are never submitted or written to browser storage. Only a fixed fictional citizen account marker and its resident-link state are saved locally; sign-out or the session-expiry preview removes them. Data persists only as described here. Business records and scope controls are bundled sample data, not a security boundary.

## Feature-based architecture

```text
src/
  app/                         Thin Next.js routes and layouts
    (public)/                  Shared public shell, account, sign-in, guides
    ops/                       Staff workspace entry
  features/
    public-information/        Landing, tourism entry, help, credits
    service-directory/         Catalog, filters, cards, service details
    request-tracking/          Public request projection, schema, local lookup
    unified-account-and-id/    Auth, account, representation and municipal ID lifecycle
    business-permits-licensing/ M03 business, four-path application and BPLO journey maps
    operations-overview/       Module catalog, local Refine provider, staff shell
    resident-household-registry/ Scoped M01 records, workflows and selectors
    document-routing-records/   M05 fixtures, schemas, routing operations, forms and previews
    payments-treasury/           M06 financial contracts, local ledger, payer, cashier and reconciliation workflows
    barangay-certifications/     M07 request, correction, review, fee, issuance and validity lifecycle
    sectoral-assistance/          M08 sector and assistance journeys
    disaster-evacuation-relief/   M09 exercise, center, distribution and assessment journeys
    restricted-case-management/  M10 guarded case and aggregate projections
    citizen-service-desk/         M11 requests, appointments and counter workflows
    development-planning/         M12 proposals, prioritization and plans
    projects-procurement-monitoring/ M13 portfolio and execution lifecycle
    budget-accounting/            M14 funds, obligations and releases
    gis-reporting-oversight/      M15 insights, maps, reports and quality
    public-information-transparency/ M16 publication and editorial workflows
    platform-administration/      M17 access, privacy, operations and scenarios
  shared/
    components/ui/             shadcn primitives retained from the template
    components/                Brand and page-heading components
    layouts/                   Reusable public layout
    providers/                 Fictional session context
    hooks/                     Shared responsive hook
    lib/                       Small shared helpers
  config/                      Application name and public navigation
```

Feature folders own their data, types, schemas, services, components, and views where needed. Add each future module as its own feature; reuse shared primitives and keep route files thin. Avoid empty folders, duplicate caches, and unrelated logic in route components.

### Data and state

- Static public content renders with server components; interactive views use client components.
- Refine is scoped to the staff workspace and consumes a local asynchronous data provider. Telemetry is disabled.
- Refine/TanStack Query owns the module resource cache. Switching persona remounts the workspace data context and clears selection/search/scenario.
- React Hook Form and Zod own form validation.
- Local component state owns filters, preview scenarios, dialogs, and OTP progress. The small session provider is shared because both header and account use it.
- Public tracking data intentionally excludes applicant identity, addresses, attachments, and restricted case content.
- Municipal ID review and credential lifecycle changes use a feature-owned in-memory provider; its public verifier consumes a separate typed projection that contains no personal fields.
- New business mutations should go through feature-owned local repositories and update their owning query cache.
- No server actions, business API routes, database, SMS, payment gateway, PCG integration, or real account verification are included.
- Next.js supplies page rendering. Images are served directly from public/images: the external macOS volume produces AppleDouble metadata that interferes with Next’s image cache. This is not a deployment configuration.

### Theme

The brand primary color **aliases the success token**:

```css
--success: #15803d;
--primary: var(--success);
--primary-foreground: #ffffff;
```

Primary actions, links, focus, selected navigation, and supporting green surfaces use these shared values. Status labels also include text. Tokens and the current responsive visual styles live in `src/app/globals.css`. Fonts are self-hosted through the template's Geist dependency. The wordmark is a placeholder brand, not an official municipal seal.

### Validation

These commands belong to the later consolidated validation pass. They were not run for the fast-track M03–M17 requirements implementation under the current requirements-first instruction.

```bash
npm run typecheck
npm run lint
npm run check
npm run test:unit
npm run build
```

With the preview server running, execute `npm run test:browser` and `npm run test:a11y`. Install a test browser with `npx playwright install chromium` if it is not already available. Set `PREVIEW_URL` when using a different port. Browser screenshots are written to the ignored `test-results/` directory.

See [validation notes](docs/validation.md) for browser checks and known scope limits.

## Sources and planning

- Template location supplied by user: `../../Templates/next-shadcn-admin-dashboard-main`.
- Template MIT license retained in [LICENSE](LICENSE). Dependencies and lockfile inherited from the template.
- [Development plans](../DevPlan/README.md).
- [Architecture decisions](docs/architecture.md).
- Photo: “Subic Beach” by FrincesEzra, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Subic_Beach.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Attribution is also available at `/credits`.

Do not add E01–E11 department extensions to navigation or implementation: they remain presentation-only. Fees, processing periods, office contacts, official branding, and statutory requirements need LGU confirmation before any public launch.
