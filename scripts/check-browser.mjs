import { chromium } from "playwright";

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baseURL = process.env.PREVIEW_URL ?? "http://localhost:3000";
const output = new URL("../test-results/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const externalRequests = new Set();
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  const url = new URL(request.url());
  if (url.protocol.startsWith("http") && url.origin !== new URL(baseURL).origin) externalRequests.add(url.origin);
});
const checks = [];
async function check(name, run) {
  await run();
  checks.push(name);
  console.log("PASS", name);
}
async function open(path) {
  // The landing page streams a background video, so the network never goes
  // idle. `load` still fires, and is the right signal here.
  const response = await page.goto(baseURL + path, { waitUntil: "load" });
  assert.equal(response.status(), 200, path);
  await page.locator("#main-content, main").first().waitFor({ state: "visible" });
  for (const image of await page.locator("img").all()) {
    await image.evaluate(async (element) => {
      element.loading = "eager";
      await element.decode();
      if (element.naturalWidth === 0) throw new Error("Preview image failed to load.");
    });
  }
}
async function visible(locator) {
  await locator.waitFor({ state: "visible" });
}
try {
  await check("Public landing and green primary", async () => {
    await open("/");
    assert.match(await page.locator("h1").innerText(), /MAYAD NA\s+MATNOG/);
    assert.equal(await page.locator(".service-card").count(), 6);
    assert.equal(
      await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--success").trim()),
      "#15803d",
    );
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(".skip-link").evaluate((element) => document.activeElement === element), true);
    await page.screenshot({ path: fileURLToPath(new URL("landing-desktop.png", output)), fullPage: true });
  });
  await check("Hero search, directory filtering, and recovery from no results", async () => {
    await page.getByLabel("Find a municipal service").fill("business");
    await page.getByRole("button", { name: "Search municipal services" }).click();
    await page.waitForURL("**/services?q=business");
    await visible(page.locator(".service-card").first());
    assert.ok((await page.locator(".service-card").count()) > 0);
    await page.getByRole("searchbox", { name: "Search services" }).fill("no-such-service");
    await visible(page.getByRole("heading", { name: "No matching services" }));
    await page.getByRole("button", { name: "Reset filters" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".service-card").length === 8);
    assert.equal(await page.locator(".service-card").count(), 8);
    await page.getByRole("button", { name: "For visitors", exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll(".service-card").length === 1);
    assert.equal(await page.locator(".service-card").count(), 1);
    await page.locator(".service-card").click();
    await visible(page.getByRole("heading", { name: "Tourism & visitor registration", exact: true }));
  });
  await check("Tracking validation, found timeline, and unknown reference", async () => {
    await open("/track");
    await page.getByRole("button", { name: "Track request", exact: true }).click();
    await visible(page.getByText("Enter your reference number.", { exact: true }));
    await page.getByRole("button", { name: "DEMO-CERT-001", exact: true }).click();
    await page.getByRole("button", { name: "Track request", exact: true }).click();
    await visible(page.getByRole("heading", { name: "Barangay residency certificate" }));
    assert.equal(await page.locator(".timeline li").count(), 3);
    await page.getByLabel("Reference number").fill("DEMO-UNKNOWN");
    await page.getByRole("button", { name: "Track request", exact: true }).click();
    await visible(page.getByRole("heading", { name: "Reference not found" }));
    await page.getByLabel("Reference number").fill("demo-bpl-001");
    await page.getByRole("button", { name: "Track request", exact: true }).click();
    await visible(page.getByRole("heading", { name: "Business permit renewal" }));
  });
  await check("Phone validation, OTP failure, resend, and expiry", async () => {
    await open("/auth/phone?service=business-permits");
    await page.clock.install();
    await page.getByLabel("Mobile number", { exact: true }).fill("123");
    await page.getByRole("button", { name: "Continue with mobile number" }).click();
    await visible(page.locator("#phone-error"));
    await page.getByRole("button", { name: /Use demo number/ }).click();
    await page.getByRole("button", { name: "Continue with mobile number" }).click();
    await page.waitForURL("**/auth/verify?service=business-permits");
    await visible(page.getByLabel("Six-digit code"));
    await page.getByRole("button", { name: "Change number" }).click();
    await page.waitForURL("**/auth/phone?service=business-permits");
    assert.equal(await page.getByLabel("Mobile number", { exact: true }).inputValue(), "09170000000");
    await page.getByRole("button", { name: "Continue with mobile number" }).click();
    await page.waitForURL("**/auth/verify?service=business-permits");
    await page.getByLabel("Six-digit code").fill("000000");
    await page.getByRole("button", { name: "Verify & continue" }).click();
    await visible(page.getByText("That code does not match. Use demo code 123456.", { exact: true }));
    await page.clock.fastForward(31000);
    await page.getByRole("button", { name: "Generate another demo code" }).click();
    await visible(page.getByText(/Demo challenge 2 is ready. The mobile number was kept./));
    await page.clock.fastForward(301000);
    assert.equal(await page.getByRole("button", { name: "Verify & continue" }).isDisabled(), true);
    await page.getByRole("button", { name: "Generate another demo code" }).click();
    await page.getByLabel("Six-digit code").fill("123456");
    await page.getByRole("button", { name: "Verify & continue" }).click();
    await page.clock.runFor(1000);
    await page.clock.resume();
    await page.waitForURL("**/services/business-permits/start");
    await visible(page.getByRole("heading", { name: "Confirm the requester before the service starts" }));
    assert.match(await page.locator("main").innerText(), /phone-verified visitor/i);
    assert.match(await page.locator("main").innerText(), /Mara Dela Cruz · DEMO-VIS-001/);
    await page.getByRole("link", { name: "Review account or change requester", exact: true }).click();
    await page.waitForURL("**/account/profile?service=business-permits");
    await visible(page.getByRole("heading", { name: "Hello, Mara." }));
    // The redesigned profile page drops the service-intent context and the
    // access-boundary summary; both are recorded as open M02 gaps. What it must
    // still get right is the account state itself.
    assert.match(await page.locator("main").innerText(), /Phone-verified visitor/);
    // Verifying a number must not present the holder as a linked resident.
    assert.doesNotMatch(await page.locator("main").innerText(), /Verified resident/);
    assert.doesNotMatch(await page.locator("main").innerText(), /Municipal resident ID/);
    assert.doesNotMatch(await page.locator("main").innerText(), /Date of birth|Household record/);
  });
  await check("Payer checkout stays local and separates attempt, collection, and receipt", async () => {
    await open("/payments");
    await visible(page.getByRole("heading", { name: "Payments and assessments" }));
    assert.match(await page.locator("main").innerText(), /DEMO-TRIP-001/);
    assert.doesNotMatch(await page.locator("main").innerText(), /DEMO-BPL-PARTIAL-BLOCK/);
    assert.doesNotMatch(await page.locator("main").innerText(), /card number|wallet password|bank password/i);
    await visible(page.getByRole("heading", { name: "Scenario walkthrough", exact: true }));
    await page.getByLabel("Payment scenario").selectOption("DEMO-ASM-003");
    await visible(page.getByText(/A failed attempt has no confirmed collection or government receipt/));
    await page.getByRole("link", { name: "Open selected scenario", exact: true }).click();
    await page.waitForURL("**/payments/attempts/DEMO-ATT-003");
    await visible(page.getByRole("heading", { name: "Payment attempt", exact: true }));
    await visible(page.getByText("Failed", { exact: true }));
    await visible(page.getByRole("heading", { name: "No confirmed collection", exact: true }));

    await open("/payments/assessments/DEMO-ASM-003");
    await visible(page.getByRole("heading", { name: "Assessment DEMO-ASM-003" }));
    assert.match(await page.locator("main").innerText(), /Item breakdown/);
    assert.match(await page.locator("main").innerText(), /₱2,000.00/);
    assert.match(await page.locator("main").innerText(), /M04 payment gate/);
    assert.match(await page.locator("main").innerText(), /Payment incomplete/);
    assert.match(await page.locator("main").innerText(), /M04 departure remains blocked/);
    assert.match(await page.locator("main").innerText(), /Private-operator payee/);
    await page.getByRole("radio", { name: "Sample online bank" }).click();
    await page.getByRole("button", { name: "Continue sample checkout" }).click();
    await page.waitForURL("**/payments/attempts/DEMO-ATT-003-R2");
    await visible(page.getByText("Pending", { exact: true }));
    await visible(page.getByRole("heading", { name: "No confirmed collection" }));
    assert.equal(await page.getByRole("link", { name: "View sample receipt" }).count(), 0);

    await page.getByRole("button", { name: "Recheck sample result" }).click();
    await visible(page.getByRole("heading", { name: "Confirmed collection" }));
    await page.getByRole("link", { name: "View sample receipt" }).click();
    await page.waitForURL("**/payments/receipts/DEMO-RCP-003-R2");
    await visible(page.getByText("SAMPLE — NOT AN OFFICIAL RECEIPT", { exact: true }));
    assert.match(await page.locator("main").innerText(), /DEMO-PAY-003-R2/);
    await open("/account/profile?service=business-permits");
    await visible(page.getByRole("heading", { name: "Hello, Mara." }));
  });
  await check("Resident linking and requester contexts require explicit confirmation", async () => {
    await page.getByLabel("Resident matching preview").selectOption("no-match");
    await visible(page.getByText("No resident match found", { exact: true }));
    await page.getByRole("button", { name: "Record assisted registration inquiry", exact: true }).click();
    await visible(page.getByText(/DEMO-ASSIST-001 recorded locally/));
    await page.getByLabel("Resident matching preview").selectOption("multiple");
    await visible(page.getByText("Two possible resident matches need review", { exact: true }));
    assert.equal(
      await page
        .getByRole("button", { name: "Resident link blocked pending duplicate review", exact: true })
        .isDisabled(),
      true,
    );
    await page.getByLabel("Resident matching preview").selectOption("shared-contact");
    await visible(page.getByText(/This demo phone is shared by more than one household contact/));
    await page.getByLabel("Resident matching preview").selectOption("suggested");

    await visible(page.getByLabel("Acting for"));
    assert.equal(await page.getByLabel("Acting for").inputValue(), "self");
    assert.match(
      await page.locator(".active-context-card").innerText(),
      /CURRENT REQUESTER\s+Mara Dela Cruz\s+Own account/,
    );

    await page.getByLabel("Acting for").selectOption("DEMO-REP-002");
    await visible(page.getByRole("alertdialog", { name: "Act for Demo Bay Tours?" }));
    await page.getByRole("button", { name: "Use this context", exact: true }).click();
    await visible(page.getByText("Requester context changed to Demo Bay Tours.", { exact: true }));
    assert.equal(await page.getByLabel("Acting for").inputValue(), "DEMO-REP-002");
    assert.match(
      await page.locator(".active-context-card").innerText(),
      /CURRENT REQUESTER\s+Demo Bay Tours\s+Authorized business representative/,
    );

    await page.getByRole("button", { name: "Preview service handoff", exact: true }).click();
    await visible(page.getByRole("alertdialog", { name: "Continue as Demo Bay Tours?" }));
    await page.getByRole("button", { name: "Confirm requester", exact: true }).click();
    await visible(
      page.getByText("Context confirmed for Demo Bay Tours. No service request was submitted.", { exact: true }),
    );

    await page.getByRole("button", { name: "Preview authority expiry", exact: true }).click();
    await visible(page.getByText(/Demo Bay Tours authority expired in this preview/));
    assert.equal(await page.getByLabel("Acting for").inputValue(), "self");
    assert.match(await page.locator(".active-context-card").innerText(), /CURRENT REQUESTER\s+Mara Dela Cruz/);
    assert.equal(await page.getByLabel("Acting for").locator('option[value="DEMO-REP-002"]').count(), 0);

    const requestButton = page.getByRole("button", { name: "Request resident link review", exact: true });
    assert.equal(await requestButton.isDisabled(), true);
    await page.getByLabel("I confirm this is my own resident record.").check();
    assert.equal(await requestButton.isEnabled(), true);
    await page.getByRole("button", { name: "Request resident link review", exact: true }).click();
    await visible(page.getByRole("alertdialog", { name: "Request a review for this resident record?" }));
    await page.getByRole("button", { name: "Send demo request", exact: true }).click();
    await visible(page.getByText("Resident link review pending", { exact: true }));
    await visible(page.getByText("DEMO-LINK-001", { exact: true }));
    assert.match(await page.locator("main").innerText(), /Municipal registry reviewer/);
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    assert.doesNotMatch(storage, /09170000000|123456/);
    assert.match(storage, /Mara Dela Cruz/);
    await page.reload({ waitUntil: "networkidle" });
    await visible(page.getByRole("heading", { name: "Hello, Mara." }));
    await visible(page.getByText("Resident link review pending", { exact: true }));
    await page.screenshot({ path: fileURLToPath(new URL("account-desktop.png", output)), fullPage: true });
    await page.getByRole("button", { name: "Preview session expiry", exact: true }).click();
    await visible(page.getByRole("heading", { name: "Your demo session ended." }));
    assert.equal(await page.evaluate(() => localStorage.getItem("digital-matnog-demo-session-v1")), null);
    await open("/account");
    await page.waitForURL("**/account/profile");
    await visible(page.getByRole("heading", { name: "Your account starts here." }));
  });
  await check("Recovery and separate staff verification stay local", async () => {
    await open("/auth/recover");
    await page.getByRole("button", { name: "Request assisted review" }).click();
    await visible(page.locator("#current-phone-error"));
    await page.getByRole("button", { name: "Use demo recovery details" }).click();
    await page.getByRole("button", { name: "Request assisted review" }).click();
    await visible(page.getByRole("heading", { name: "Recovery review recorded." }));
    assert.match(await page.locator("main").innerText(), /No account or phone number was changed/);
    assert.match(await page.locator("main").innerText(), /Resident association\s+Unchanged/);

    await open("/staff/sign-in");
    await page.getByRole("button", { name: "Use demo staff credentials" }).click();
    await page.getByRole("button", { name: "Continue to staff verification" }).click();
    await visible(page.getByLabel("Six-digit staff code"));
    await page.getByLabel("Six-digit staff code").fill("000000");
    await page.getByRole("button", { name: "Verify staff demo" }).click();
    await visible(page.getByText("That demo staff code does not match. Use 654321.", { exact: true }));
    await page.getByLabel("Six-digit staff code").fill("654321");
    await page.getByRole("button", { name: "Verify staff demo" }).click();
    await visible(page.getByRole("heading", { name: "Staff demo ready." }));
    await visible(page.getByRole("link", { name: "Enter staff workspace", exact: true }));
    const storage = await page.evaluate(() =>
      JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
    );
    assert.doesNotMatch(storage, /demo\.staff|STAFF2026|654321|09171111111/);
  });
  await check("Municipal ID review, replacement, and public invalidation stay consistent", async () => {
    await page.evaluate(() => {
      localStorage.setItem(
        "digital-matnog-demo-session-v1",
        JSON.stringify({
          version: 2,
          accountId: "DEMO-VIS-001",
          name: "Mara Dela Cruz",
          phoneVerification: "verified",
          residentAssociation: {
            personId: "DEMO-PER-001",
            status: "pending",
            requestId: "DEMO-LINK-001",
            relationship: "self",
            submittedAt: "2026-09-15T10:30:00+08:00",
            reviewStage: "municipal-registry-review",
          },
        }),
      );
      sessionStorage.setItem(
        "digital-matnog-workspace-session-v1",
        JSON.stringify({ role: "municipal", scenario: "normal" }),
      );
    });
    await open("/ops/identity/applications");
    await visible(page.getByRole("heading", { name: "Identity applications", exact: true }));

    await page.getByRole("tab", { name: "Enrollment" }).click();
    await visible(page.getByText(/Enrollment decision is blocked until DEMO-LINK-001 is approved/));
    assert.equal(await page.getByRole("button", { name: "Approve enrollment", exact: true }).isDisabled(), true);

    await page.getByRole("tab", { name: "Resident link" }).click();
    await page.getByRole("button", { name: "Approve resident association", exact: true }).click();
    await visible(page.getByText("Resident association approved in the UI demo.", { exact: true }));

    await page.getByRole("tab", { name: "Enrollment" }).click();
    await page.getByRole("button", { name: "Return for correction", exact: true }).click();
    await visible(page.getByText("Enter at least eight characters for this decision.", { exact: true }));
    await page.getByLabel("Decision reason").fill("Please confirm the sample photo framing.");
    await page.getByRole("button", { name: "Return for correction", exact: true }).click();
    await visible(page.getByText("Enrollment returned for correction.", { exact: true }));

    await page.getByRole("link", { name: "Open citizen wallet", exact: true }).click();
    await page.waitForURL("**/account/id");
    await visible(page.getByRole("heading", { name: "Your sample ID wallet", exact: true }));
    await visible(page.getByText(/Correction requested: Please confirm the sample photo framing/));
    await page.getByRole("button", { name: "Apply sample correction and resubmit", exact: true }).click();
    await visible(page.getByText("Corrected sample enrollment resubmitted.", { exact: true }));

    await page.getByRole("link", { name: "Open UI demo review queue", exact: true }).click();
    await page.waitForURL("**/ops/identity/applications");
    await page.getByRole("tab", { name: "Enrollment" }).click();
    await page.getByRole("button", { name: "Approve enrollment", exact: true }).click();
    await visible(page.getByRole("alertdialog", { name: "Approve this enrollment?" }));
    await page.getByRole("button", { name: "Issue sample credential", exact: true }).click();
    await visible(page.getByText("DEMO-MID-001", { exact: true }));

    await page.getByRole("link", { name: "Open citizen ID wallet", exact: true }).click();
    await page.waitForURL("**/account/id");
    await visible(page.getByRole("heading", { name: "Your sample ID wallet", exact: true }));
    await visible(page.locator(".municipal-id-card"));
    assert.match(await page.locator(".municipal-id-card").innerText(), /DEMO-MID-001/);
    await page.getByRole("button", { name: "Submit replacement review", exact: true }).click();
    await visible(page.getByText("Enter at least eight characters for the replacement reason.", { exact: true }));
    await page.getByLabel("Replacement reason").fill("The fictional sample card was damaged.");
    await page.getByRole("button", { name: "Submit replacement review", exact: true }).click();
    await visible(page.getByText(/DEMO-MID-001 stays valid until approval/));

    await page.getByRole("link", { name: "Open UI demo review queue", exact: true }).click();
    await page.waitForURL("**/ops/identity/applications");
    await page.getByRole("tab", { name: "Enrollment" }).click();
    await page.getByRole("button", { name: "Approve replacement", exact: true }).click();
    await visible(page.getByRole("alertdialog", { name: "Approve this replacement?" }));
    await page.getByRole("button", { name: "Issue replacement", exact: true }).click();

    const oldCredential = page.locator(".credential-history li").filter({ hasText: "DEMO-MID-001" });
    const newCredential = page.locator(".credential-history li").filter({ hasText: "DEMO-MID-002" });
    assert.match(await oldCredential.innerText(), /superseded/i);
    assert.match(await newCredential.innerText(), /active/i);
    assert.match(await oldCredential.innerText(), /DEMO-PER-001/);
    assert.match(await newCredential.innerText(), /DEMO-PER-001/);

    await oldCredential.getByRole("link", { name: "Public result", exact: true }).click();
    await page.waitForURL("**/verify/id/DEMO-ID-TOKEN-001");
    await visible(page.getByText("Invalid sample credential", { exact: true }));
    const publicResult = await page.locator("#main-content").innerText();
    assert.doesNotMatch(publicResult, /Mara Reyes Dela Cruz|DEMO-PER-001|DEMO-HH-001|Demo Barangay A/);

    await page.goBack({ waitUntil: "networkidle" });
    await visible(page.getByRole("heading", { name: "Identity applications", exact: true }));
    await page.getByRole("tab", { name: /Credentials/ }).click();
    await page
      .locator(".credential-history li")
      .filter({ hasText: "DEMO-MID-002" })
      .getByRole("link", { name: "Public result", exact: true })
      .click();
    await visible(page.getByText("Valid sample credential", { exact: true }));
    await page.getByLabel("Verification preview").selectOption("offline");
    await visible(page.getByText("Stale cached result", { exact: true }));
    assert.match(await page.locator("#main-content").innerText(), /Reconnect before relying on its current status/);
    assert.doesNotMatch(await page.locator("#main-content").innerText(), /Mara Reyes Dela Cruz|DEMO-PER-001/);
  });
  await check("Staff catalog, role scope, error recovery, empty state, and reset", async () => {
    await open("/ops");
    await visible(page.getByRole("button", { name: "View scope for M01", exact: true }));
    assert.equal(await page.locator("tbody tr").count(), 17);
    await page.getByRole("button", { name: "View scope for M10", exact: true }).click();
    await visible(page.getByRole("dialog"));
    assert.match(await page.getByRole("dialog").innerText(), /requires explicit assignment/);
    await page.getByRole("button", { name: "Back to workspace", exact: true }).click();
    await page.getByLabel("Demo persona").selectOption("partner");
    await visible(page.getByRole("button", { name: "View scope for M04", exact: true }));
    assert.equal(await page.locator("tbody tr").count(), 2);
    assert.equal(await page.getByRole("button", { name: "View scope for M10", exact: true }).count(), 0);
    await page.getByLabel("Preview state").selectOption("error");
    await visible(page.getByRole("heading", { name: "We couldn’t load this preview." }));
    await page.getByRole("button", { name: "Retry with sample data", exact: true }).click();
    await visible(page.getByRole("button", { name: "View scope for M04", exact: true }));
    await page.getByLabel("Preview state").selectOption("empty");
    await visible(page.getByRole("heading", { name: "Your workspace is clear." }));
    await page.getByRole("button", { name: "Reset preview", exact: true }).click();
    await visible(page.getByRole("button", { name: "View scope for M01", exact: true }));
    assert.equal(await page.locator("tbody tr").count(), 17);
    await page.getByRole("searchbox", { name: "Search modules" }).fill("no-such-module");
    await visible(page.getByRole("heading", { name: "No modules match your filters." }));
    await page.getByRole("button", { name: "Reset preview", exact: true }).click();
    await visible(page.getByRole("button", { name: "View scope for M01", exact: true }));
    await page.screenshot({ path: fileURLToPath(new URL("workspace-desktop.png", output)), fullPage: true });
  });
  await check("Demo clock is fixed, advanceable, and resettable", async () => {
    await open("/ops");
    const clock = page.locator(".demo-clock strong");
    // The prototype must not read the real date, so the epoch is always shown.
    await visible(clock);
    assert.equal(await clock.innerText(), "September 15, 2026");
    await page.getByRole("button", { name: "+1 day", exact: true }).click();
    assert.equal(await clock.innerText(), "September 16, 2026");
    await page.getByRole("button", { name: "+7 days", exact: true }).click();
    assert.equal(await clock.innerText(), "September 23, 2026");
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(await clock.innerText(), "September 15, 2026");
    await page.getByRole("button", { name: "+7 days", exact: true }).click();
    await page.getByRole("button", { name: "Reset demo", exact: true }).click();
    assert.equal(await clock.innerText(), "September 15, 2026");
  });
  await check("Registry directory scope, filters, and person detail", async () => {
    await open("/ops/residents");
    await visible(page.getByRole("heading", { name: "Residents", exact: true }));
    await visible(page.getByText("DEMO-PER-001", { exact: true }));
    await page.screenshot({ path: fileURLToPath(new URL("m01-residents-desktop.png", output)), fullPage: true });
    // The municipal steward sees across barangays.
    assert.equal(await page.locator("tbody tr").count(), 6);
    await page.getByLabel("Verification").selectOption("stale");
    await visible(page.getByText("DEMO-PER-006", { exact: true }));
    assert.equal(await page.locator("tbody tr").count(), 2);
    await page.getByLabel("Verification").selectOption("");
    await visible(page.getByText("DEMO-PER-002", { exact: true }));
    await page.getByRole("searchbox", { name: "Search residents" }).fill("zzz-no-match");
    await visible(page.getByRole("heading", { name: "No residents match your filters." }));
    await page.getByRole("button", { name: "Reset filters", exact: true }).click();
    await visible(page.getByText("DEMO-PER-002", { exact: true }));
    assert.equal(await page.locator("tbody tr").count(), 6);

    await page.getByRole("link", { name: "Open DEMO-PER-001", exact: true }).click();
    await page.waitForURL("**/ops/residents/DEMO-PER-001");
    await visible(page.getByRole("heading", { name: "Mara Reyes Dela Cruz" }));
    await page.getByRole("tab", { name: "Residency" }).click();
    await visible(page.getByText("Demo Barangay A", { exact: true }));
    await page.getByRole("tab", { name: "Activity" }).click();
    await visible(page.getByText("Record seeded", { exact: true }));
  });
  await check("Registry scope is enforced per demo persona", async () => {
    await open("/ops");
    await page.getByLabel("Demo persona").selectOption("barangay");
    await open("/ops/residents");
    await visible(page.getByText("DEMO-PER-001", { exact: true }));
    // Barangay staff never see a person who has only lived elsewhere.
    assert.equal(await page.getByText("DEMO-PER-003", { exact: true }).count(), 0);
    await open("/ops/residents/DEMO-PER-003");
    await visible(page.getByRole("heading", { name: "This record is outside your scope" }));
    // The message must not confirm who the hidden record belongs to.
    assert.doesNotMatch(await page.locator("#main-content").innerText(), /Dela Cruz-Santos/);

    await open("/ops");
    await page.getByLabel("Demo persona").selectOption("partner");
    await open("/ops/residents");
    await visible(page.getByRole("heading", { name: "The registry is not part of this workspace" }));
    await open("/ops");
    await page.getByLabel("Demo persona").selectOption("municipal");
  });
  await check("Registry permission and slow-response scenarios are selectable", async () => {
    await open("/ops");
    await page.getByLabel("Preview state").selectOption("denied");
    await open("/ops/residents");
    await visible(page.getByRole("heading", { name: "This workspace is not available" }));

    await open("/ops");
    await page.getByLabel("Preview state").selectOption("slow");
    await open("/ops/residents");
    await visible(page.getByText("Loading the resident directory…", { exact: true }));
    await visible(page.getByText("DEMO-PER-001", { exact: true }));

    await open("/ops");
    await page.getByLabel("Preview state").selectOption("normal");
  });
  await check("Household directory, stale filter, and shared structure", async () => {
    await open("/ops/households");
    await visible(page.getByRole("heading", { name: "Households", exact: true }));
    await visible(page.getByText("Bermudo household", { exact: true }));
    assert.equal(await page.locator(".registry-household-card").count(), 3);
    await page.getByLabel("Only verification overdue").check();
    await page.getByText("Dela Cruz household", { exact: true }).waitFor({ state: "detached" });
    // Wait for the filtered result to render, not just for the old one to go.
    await visible(page.getByText("Bermudo household", { exact: true }));
    assert.equal(await page.locator(".registry-household-card").count(), 1);
    await page.getByLabel("Only verification overdue").uncheck();
    await visible(page.getByText("Dela Cruz household", { exact: true }));

    await open("/ops/households/DEMO-HH-001");
    await visible(page.getByRole("heading", { name: "Dela Cruz household" }));
    // Two households share DEMO-STR-001 and keep separate counts.
    assert.match(await page.locator("#main-content").innerText(), /Bermudo household/);
    assert.match(await page.locator("#main-content").innerText(), /Households at this structure/);
    // A closed membership is still listed.
    assert.match(await page.locator("#main-content").innerText(), /Rosario Dela Cruz/);
    // Unknown is presented distinctly from no.
    assert.match(await page.locator("#main-content").innerText(), /Unknown/);
  });
  await check("S01: transfer preserves the person ID and prior residency", async () => {
    await open("/ops/registry/review");
    await visible(page.getByRole("heading", { name: "Review queues", exact: true }));
    await page.getByRole("tab", { name: "Transfers" }).click();
    await visible(page.getByRole("heading", { name: "Transfer request" }));

    await page.getByRole("button", { name: "Release from origin", exact: true }).click();
    await page.getByRole("button", { name: "Release", exact: true }).click();
    await visible(page.getByRole("button", { name: "Accept at destination", exact: true }));
    await page.getByRole("button", { name: "Accept at destination", exact: true }).click();
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await visible(page.getByText("Completed", { exact: true }));

    // Navigate in-app: registry changes live in memory for the application
    // instance, so a hard reload would start from the seeded fixtures again.
    await page.getByRole("link", { name: "DEMO-PER-001", exact: true }).click();
    await page.waitForURL("**/ops/residents/DEMO-PER-001");
    await visible(page.getByRole("heading", { name: "Mara Reyes Dela Cruz" }));
    // The person ID is unchanged.
    assert.match(await page.locator("#main-content").innerText(), /DEMO-PER-001/);
    await page.getByRole("tab", { name: "Residency" }).click();
    const residency = await page.locator(".registry-periods li").count();
    assert.equal(residency, 2, "the earlier period is retained alongside the new one");
    assert.match(await page.locator(".registry-periods").innerText(), /Demo Barangay A/);
    assert.match(await page.locator(".registry-periods").innerText(), /Demo Barangay B/);
  });
  await check("Duplicate review needs a reason and can be reversed", async () => {
    await open("/ops/registry/review");
    await visible(page.getByRole("heading", { name: "Possible duplicate" }));
    // A short reason is refused before anything is recorded.
    await page.getByLabel("Decision reason").fill("short");
    await page.getByRole("button", { name: "Record as the same person", exact: true }).click();
    await page.getByRole("button", { name: "Record decision", exact: true }).click();
    await visible(page.getByRole("alert").first());
    assert.match(await page.locator("#main-content").innerText(), /at least eight characters/);

    await page.getByLabel("Decision reason").fill("Same person under a married name");
    await page.getByRole("button", { name: "Record as the same person", exact: true }).click();
    await page.getByRole("button", { name: "Record decision", exact: true }).click();
    await visible(page.getByText(/Recorded as/));

    await page.getByLabel("Decision reason").fill("Evidence was insufficient after review");
    await page.getByRole("button", { name: "Reverse this decision", exact: true }).click();
    await page.getByRole("button", { name: "Record decision", exact: true }).click();
    await visible(page.getByText(/decision by .* was reversed|was reversed/));
    assert.match(await page.locator("#main-content").innerText(), /Same person under a married name/);
  });
  await check("Registration wizard prechecks for an existing person", async () => {
    await open("/ops/residents");
    await page.getByRole("link", { name: "Register a resident", exact: true }).click();
    await page.waitForURL("**/ops/residents/new");
    await visible(page.getByRole("heading", { name: "Register a resident" }));

    // A future birth date is refused before the wizard advances.
    await page.getByLabel("First name").fill("Mara");
    await page.getByLabel("Last name").fill("Dela Cruz");
    await page.getByLabel("Date of birth").fill("2027-04-12");
    await page.getByRole("button", { name: "Continue to residency", exact: true }).click();
    await visible(page.getByText("The birth date cannot be in the future.", { exact: true }));

    await page.getByLabel("Date of birth").fill("1998-04-12");
    await page.getByLabel("Middle name").fill("Reyes");
    await page.getByRole("button", { name: "Continue to residency", exact: true }).click();
    await visible(page.getByRole("heading", { name: "Where do they live?" }));
    await page.getByLabel("Relationship to the household head").fill("Cousin");

    // Values survive a step back and forward.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await visible(page.getByRole("heading", { name: "Who is being registered?" }));
    assert.equal(await page.getByLabel("First name").inputValue(), "Mara");
    await page.getByRole("button", { name: "Continue to residency", exact: true }).click();
    assert.equal(await page.getByLabel("Relationship to the household head").inputValue(), "Cousin");

    await page.getByRole("button", { name: "Check for existing records", exact: true }).click();
    await visible(page.getByRole("heading", { name: "Possible matches" }));
    // The existing person is surfaced rather than a duplicate being created.
    assert.match(await page.locator("#main-content").innerText(), /DEMO-PER-001/);
    assert.match(await page.locator("#main-content").innerText(), /Same date of birth/);

    await page.getByRole("button", { name: "These are different people", exact: true }).click();
    await visible(page.getByRole("heading", { name: "Review and create" }));
    await page.getByRole("button", { name: "Create draft record", exact: true }).click();
    await page.waitForURL(/\/ops\/residents\/DEMO-PER-\d+$/);
    await visible(page.getByRole("tab", { name: "Identity" }));
    // The new record starts unverified and in draft.
    assert.match(await page.locator("#main-content").innerText(), /Draft/);
    assert.match(await page.locator("#main-content").innerText(), /Unverified/);
    await page.getByRole("tab", { name: "Activity" }).click();
    assert.match(await page.locator("#main-content").innerText(), /DEMO-PER-001/);
  });
  await check("Survey assignments, conflicts, and a blocked import", async () => {
    await open("/ops/registry/surveys");
    await visible(page.getByRole("heading", { name: "Survey assignments", exact: true }));
    assert.equal(await page.locator(".registry-survey-card").count(), 3);
    assert.match(await page.locator("#main-content").innerText(), /overdue/);
    await page.screenshot({ path: fileURLToPath(new URL("m01-surveys-desktop.png", output)), fullPage: true });

    await page.getByRole("tab", { name: /Conflicts/ }).click();
    await visible(page.getByRole("heading", { name: "Queued change conflicts with the current record" }));
    assert.match(await page.locator("#main-content").innerText(), /Started from/);
    await page.getByRole("button", { name: "Keep the field value", exact: true }).first().click();
    await visible(page.getByText("Kept the field-captured value.", { exact: true }));

    await page.getByRole("tab", { name: "Import preview" }).click();
    await visible(page.getByRole("heading", { name: "Import preview" }));
    // Applying is unavailable while rows still need a decision.
    assert.equal(
      await page.getByRole("button", { name: "Apply the rows that are ready", exact: true }).isDisabled(),
      true,
    );
    assert.match(await page.locator("#main-content").innerText(), /The date of birth is in the future/);
    assert.match(await page.locator("#main-content").innerText(), /Possible duplicate/);
  });
  await check("M05 registration, routing, custody, release, and archive controls", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await open("/ops");
    await page.getByLabel("Demo persona").selectOption("barangay");
    await open("/ops/documents");
    await visible(page.getByRole("heading", { name: "Document register", exact: true }));
    assert.equal(await page.getByRole("link", { name: "Open record", exact: true }).count(), 1);
    assert.match(await page.locator("#main-content").innerText(), /Sample barangay certification request/);
    assert.doesNotMatch(await page.locator("#main-content").innerText(), /Restricted legal correspondence/);
    assert.equal(await page.getByRole("link", { name: "Register document", exact: true }).count(), 0);

    await open("/ops");
    await page.getByLabel("Demo persona").selectOption("municipal");
    await open("/ops/documents");
    await visible(page.getByRole("heading", { name: "Document register", exact: true }));
    assert.equal(await page.getByRole("link", { name: "Open record", exact: true }).count(), 7);
    await page.getByRole("button", { name: "Restricted", exact: true }).click();
    assert.equal(await page.getByRole("link", { name: "Open record", exact: true }).count(), 1);
    assert.match(await page.locator("#main-content").innerText(), /Restricted legal correspondence/);
    await page.getByRole("button", { name: "All permitted", exact: true }).click();
    assert.equal(await page.getByRole("link", { name: "Open record", exact: true }).count(), 7);
    assert.match(await page.locator("#main-content").innerText(), /DOC-2026-0042/);
    assert.match(await page.locator("#main-content").innerText(), /handover pending to Office of the Mayor/);
    await page.getByRole("link", { name: "Open record", exact: true }).first().click();
    await page.waitForURL("**/ops/documents/DEMO-DOC-001");
    await visible(page.getByRole("heading", { name: "Sample coastal activity endorsement", exact: true }));
    assert.equal(await page.locator(".document-concept-grid > section").count(), 3);
    assert.match(await page.locator("#main-content").innerText(), /File version/);
    assert.match(await page.locator("#main-content").innerText(), /Route task/);
    assert.match(await page.locator("#main-content").innerText(), /Physical custody/);
    assert.match(await page.locator("#main-content").innerText(), /Custody stays with Municipal Records Office/);
    assert.match(await page.locator(".document-custody-label").innerText(), /HAND-2026-0017/);

    await open("/ops/routing/inbox");
    await visible(page.getByRole("heading", { name: "Routing inbox", exact: true }));
    assert.equal(await page.locator(".document-inbox-list article").count(), 9);
    assert.match(await page.locator("#main-content").innerText(), /Acknowledge receipt/);
    assert.match(await page.locator("#main-content").innerText(), /Open work/);
    await page.getByRole("button", { name: "Overdue", exact: true }).click();
    assert.equal(await page.locator(".document-inbox-list article").count(), 1);
    assert.match(await page.locator("#main-content").innerText(), /Venue safety review/);
    await page.getByRole("button", { name: "Delegated", exact: true }).click();
    assert.equal(await page.locator(".document-inbox-list article").count(), 1);
    assert.match(await page.locator("#main-content").innerText(), /Delegated signatory review/);

    await open("/ops/documents/DEMO-DOC-001");
    await page.getByRole("button", { name: "Acknowledge task", exact: true }).click();
    await visible(page.getByText(/Acknowledge receipt was acknowledged/));
    assert.match(await page.locator("#main-content").innerText(), /handover pending/);
    assert.match(await page.locator("#main-content").innerText(), /Municipal Records Office/);
    await page.getByLabel("Tracking reference").fill("HAND-WRONG");
    await page.locator("#receiver-office").selectOption("DEMO-OFF-MAYOR");
    await page.getByRole("button", { name: "Accept physical handover", exact: true }).click();
    await visible(page.getByText("The sample tracking reference does not match.", { exact: true }));
    await page.getByLabel("Tracking reference").fill("HAND-2026-0017");
    await page.getByRole("button", { name: "Accept physical handover", exact: true }).click();
    await visible(page.getByText(/Physical custody now names the receiving office/));
    assert.match(await page.locator("#main-content").innerText(), /Current holder\s+Office of the Mayor/);
    await page.getByLabel("Dispute reason").fill("The receiving signature does not match the label log");
    await page.getByRole("button", { name: "Mark custody disputed", exact: true }).click();
    await visible(page.getByText(/Custody is marked disputed/));
    assert.match(await page.locator("#main-content").innerText(), /Current holder\s+Office of the Mayor/);

    await open("/ops/documents/DEMO-DOC-002");
    await page.getByRole("button", { name: "Assign stage", exact: true }).click();
    await visible(page.getByText("Describe the stage in at least eight characters.", { exact: true }));
    await page.getByLabel("Stage title").fill("Municipal legal review");
    await page.getByLabel("Receiving office").selectOption("DEMO-OFF-LEGAL");
    await page.getByLabel("Assigned persona").fill("Legal reviewer");
    await page.getByLabel("Assignment note").fill("Confirm the sample certification wording");
    await page.getByRole("button", { name: "Assign stage", exact: true }).click();
    await visible(page.getByText("Municipal legal review was added to the local route.", { exact: true }));
    assert.equal(await page.locator(".document-route-task-card").count(), 2);
    await page.getByRole("button", { name: "Acknowledge task", exact: true }).click();
    await visible(page.getByText(/Municipal legal review was acknowledged/));
    await page.getByLabel("Review note").last().fill("The certification address must be corrected");
    await page.getByRole("button", { name: "Return for correction", exact: true }).last().click();
    await visible(page.getByText(/Municipal legal review was returned/));
    assert.match(await page.locator("#main-content").innerText(), /certification address must be corrected/);

    await open("/ops/documents/DEMO-DOC-003");
    await page.getByLabel("Review note").fill("Engineering review confirms the sample venue plan");
    await page.getByRole("button", { name: "Endorse stage", exact: true }).click();
    await visible(page.getByText(/Venue safety review was endorsed/));
    assert.match(await page.locator("#main-content").innerText(), /complete/);
    await page.getByLabel("Release note").fill("Released after both safety reviews were completed");
    await page.getByRole("button", { name: "Release approved revision", exact: true }).click();
    await visible(page.getByText(/explicitly approved revision was released/));
    assert.match(await page.locator(".document-release-receipt").innerText(), /Revision 1/);
    assert.match(await page.locator(".document-release-receipt").innerText(), /SAMPLE-REL-DOC-2026-0044/);

    await open("/ops/documents/DEMO-DOC-005");
    assert.match(await page.locator("#main-content").innerText(), /expired delegation/);
    assert.equal(await page.getByRole("button", { name: "Endorse stage", exact: true }).isDisabled(), true);
    await open("/ops/documents/DEMO-DOC-006");
    assert.match(await page.locator("#main-content").innerText(), /Restricted legal correspondence/);
    assert.match(await page.locator("#main-content").innerText(), /restricted/);
    await open("/ops/documents/DEMO-DOC-007");
    assert.match(await page.locator("#main-content").innerText(), /Archive hold active/);
    assert.match(await page.locator(".document-release-receipt").innerText(), /SAMPLE-REL-DOC-2026-0048/);

    await open("/ops/documents/archive");
    await visible(page.getByRole("heading", { name: "Archive preview", exact: true }));
    assert.equal(await page.locator(".document-archive-card").count(), 1);
    assert.match(await page.locator("#main-content").innerText(), /Revision 1 · sample-archive-hold-r1.pdf/);
    await page.getByLabel("Reason for clearing the hold").fill("The sample audit review is complete");
    await page.getByRole("button", { name: "Clear archive hold", exact: true }).click();
    await visible(page.getByText("Archive hold cleared.", { exact: true }));

    await open("/ops/documents/new");
    await visible(page.getByRole("heading", { name: "Register a document", exact: true }));
    await page.getByRole("button", { name: "Register document", exact: true }).click();
    await visible(page.getByText("Enter a document type of at least three characters.", { exact: true }));
    await page.getByRole("button", { name: "Use sample values", exact: true }).click();
    await page.getByRole("button", { name: "Register document", exact: true }).click();
    await page.waitForURL("**/ops/documents/DEMO-DOC-008");
    await visible(page.getByRole("heading", { name: "Sample request for coordinated office review", exact: true }));
    assert.match(await page.locator("#main-content").innerText(), /No file bytes are loaded/);

    await page.getByRole("button", { name: "Add replacement revision", exact: true }).click();
    await visible(page.getByText("Choose a bundled sample PDF.", { exact: true }));
    await page.getByLabel("Replacement sample").selectOption("sample-readable-replacement.pdf");
    await page.getByLabel("Version note").fill("short");
    await page.getByRole("button", { name: "Add replacement revision", exact: true }).click();
    await visible(page.getByText("Explain the replacement in at least eight characters.", { exact: true }));
    await page.getByLabel("Version note").fill("Readable replacement for office review");
    await page.getByRole("button", { name: "Add replacement revision", exact: true }).click();
    await visible(page.getByText("Revision 2 is now the routed sample file.", { exact: true }));
    assert.equal(await page.locator(".document-version-list article").count(), 2);
    await page.getByLabel("Preview revision").selectOption("DEMO-FILE-008-V1");
    await visible(page.getByRole("region", { name: "Sample preview for sample-incoming-letter.pdf" }));

    await open("/ops/routing/templates");
    await visible(page.getByRole("heading", { name: "Routing templates", exact: true }));
    assert.equal(await page.locator(".document-template-stage-list li").count(), 2);
    await page.getByRole("button", { name: "Add stage", exact: true }).click();
    await visible(page.getByText("Describe the stage in at least eight characters.", { exact: true }));
    await page.getByLabel("Stage title").fill("Records release check");
    await page.getByLabel("Assigned persona").fill("Records releasing clerk");
    await page.getByLabel("Target days").fill("1");
    await page.getByLabel("Require receipt acknowledgment").last().check();
    await page.getByRole("button", { name: "Add stage", exact: true }).click();
    await visible(page.getByText("Stage added to the unsaved sample version.", { exact: true }));
    assert.equal(await page.locator(".document-template-stage-list li").count(), 3);
    await page.getByRole("button", { name: "Save sample version", exact: true }).click();
    await visible(page.getByText("Saved fictional template version 4 in local memory.", { exact: true }));

    await open("/track/documents/DOC-2026-0048");
    await visible(page.getByRole("heading", { name: "Released municipal document", exact: true }));
    assert.match(await page.locator("#main-content").innerText(), /SAMPLE-REL-DOC-2026-0048/);
    assert.doesNotMatch(await page.locator("#main-content").innerText(), /sample-archive-hold-r1\.pdf/);
    assert.doesNotMatch(await page.locator("#main-content").innerText(), /Sample audit review remains open/);
    await open("/track/documents/DOC-2026-0047");
    await visible(page.getByRole("heading", { name: "Document unavailable", exact: true }));
    assert.doesNotMatch(await page.locator("#main-content").innerText(), /Restricted legal correspondence/);
  });
  await check("M06 cashier posting, totals, filters, and event history", async () => {
    await open("/ops/treasury/collections");
    await visible(page.getByRole("heading", { name: "Cashier collections", exact: true }));
    assert.match(await page.locator("#main-content").innerText(), /UI demonstration only/);
    assert.match(await page.locator("#main-content").innerText(), /Current cashier session\s+₱0\.00/);

    await page.getByLabel("Assessment reference").fill("DEMO-ASM-002");
    await page.getByRole("button", { name: "Look up", exact: true }).click();
    await visible(page.getByText(/Recheck DEMO-ATT-002 before cashier posting/));
    assert.equal(await page.getByRole("button", { name: "Review sample cash posting", exact: true }).count(), 0);

    await page.getByLabel("Assessment reference").fill("DEMO-ASM-003");
    await page.getByRole("button", { name: "Look up", exact: true }).click();
    await visible(page.getByText("DEMO-TRIP-PRIVATE-001", { exact: true }));
    assert.equal(await page.getByLabel("Fictional amount (PHP)").inputValue(), "2000.00");
    await page.getByRole("button", { name: "Review sample cash posting", exact: true }).click();
    await visible(page.getByRole("alertdialog", { name: "Post this fictional cash collection?" }));
    assert.match(await page.getByRole("alertdialog").innerText(), /DEMO-EVT-CASH-003-01/);
    await page.getByRole("button", { name: "Post sample collection", exact: true }).click();
    await visible(page.getByText(/DEMO-PAY-003-C1 and DEMO-RCP-003-C1 were added/));
    assert.match(
      await page.locator(".ops-stat").filter({ hasText: "Current cashier session" }).innerText(),
      /₱2,000\.00/,
    );

    await page.getByLabel("Collection channel").selectOption("cashier");
    await visible(page.locator(".ops-table button", { hasText: "Inspect history" }));
    assert.equal(await page.locator(".ops-table button", { hasText: "Inspect history" }).count(), 1);
    await page.locator(".ops-table button", { hasText: "Inspect history" }).click();
    assert.equal(await page.locator(".timeline li").count(), 6);
    assert.match(await page.locator("#main-content").innerText(), /Event DEMO-EVT-CASH-003-01/);
    assert.match(await page.locator("#main-content").innerText(), /SAMPLE — NOT AN OFFICIAL RECEIPT/);

    await open("/ops/treasury/receipts/DEMO-RCP-008");
    await visible(page.getByRole("heading", { name: "Sample Treasury receipt", exact: true }));
    assert.match(await page.locator("#main-content").innerText(), /SAMPLE — NOT AN OFFICIAL RECEIPT/);
    assert.match(await page.locator("#main-content").innerText(), /Transaction history/);
    assert.match(
      await page.locator("#main-content").innerText(),
      /Provider acknowledgment is a separate record and is not this receipt/,
    );
    assert.match(await page.locator("#main-content").innerText(), /Government receipt SAMPLE-OR-2026-008/);
    await open("/ops/treasury/receipts/DEMO-RCP-UNKNOWN");
    await visible(page.getByRole("heading", { name: "Treasury receipt unavailable", exact: true }));
    await open("/ops");
    await page.getByLabel("Demo persona").selectOption("partner");
    await open("/ops/treasury/receipts/DEMO-RCP-008");
    await visible(
      page.getByRole("heading", {
        name: "Treasury receipt history requires the municipal demo role",
        exact: true,
      }),
    );
    assert.doesNotMatch(await page.locator("#main-content").innerText(), /SAMPLE-OR-2026-008/);
    await open("/ops");
    await page.getByLabel("Demo persona").selectOption("municipal");
  });
  await check("M06 reconciliation, separation of duties, and adjustment limits", async () => {
    await open("/ops/treasury/reconciliation");
    await visible(page.getByRole("heading", { name: "Treasury reconciliation", exact: true }));
    assert.match(await page.locator("#main-content").innerText(), /DEMO-SET-008/);
    assert.match(await page.locator("#main-content").innerText(), /\+₱20\.00/);
    assert.match(await page.locator("#main-content").innerText(), /Expected net\s+₱1,075\.00/);
    assert.match(await page.locator("#main-content").innerText(), /Bank credit\s+₱1,095\.00/);
    assert.match(await page.locator("#main-content").innerText(), /Revenue posting preview/);
    assert.match(await page.locator("tr", { hasText: "DEMO-CERT-UNMATCHED" }).innerText(), /Held for reconciliation/);
    assert.match(await page.locator("#main-content").innerText(), /creates no journal entry/);

    await page.getByRole("button", { name: "Assign exception", exact: true }).click();
    await visible(page.getByText(/DEMO-SET-008 is assigned to Sample Treasury reconciler/));
    assert.match(await page.locator("#main-content").innerText(), /assigned\s+September 15, 2026/);

    await page.getByLabel("Corrected fictional bank credit (PHP)").fill("1095.00");
    await page.getByRole("button", { name: "Review corrected evidence", exact: true }).click();
    await visible(page.getByRole("alertdialog", { name: "Apply the corrected fictional bank credit?" }));
    await page.getByRole("button", { name: "Apply sample correction", exact: true }).click();
    await visible(page.getByText(/must equal the 107500 centavo net settlement/));
    assert.match(await page.locator("#main-content").innerText(), /Bank credit\s+₱1,095\.00/);

    await page.getByLabel("Corrected fictional bank credit (PHP)").fill("1075.00");
    await page.getByRole("button", { name: "Review corrected evidence", exact: true }).click();
    await page.getByRole("button", { name: "Apply sample correction", exact: true }).click();
    await visible(page.getByText(/DEMO-SET-008 now matches the corrected sample bank evidence/));
    assert.match(await page.locator("#main-content").innerText(), /Bank evidence: ₱1,095\.00 → ₱1,075\.00/);
    assert.match(
      await page.locator("tr", { hasText: "DEMO-CERT-UNMATCHED" }).innerText(),
      /Ready for M14 mapping review/,
    );

    await open("/ops/treasury/adjustments/DEMO-ADJ-001-1");
    await visible(page.getByRole("heading", { name: "DEMO-ADJ-001-1", exact: true }));
    assert.match(await page.locator("#main-content").innerText(), /Gross collection\s+₱1,250\.00/);
    await page.getByLabel("Reviewing persona").selectOption("Sample cashier requester");
    await page.getByRole("button", { name: "Approve sample adjustment", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Approve sample adjustment" }).click();
    await visible(page.getByText("The requesting persona cannot review its own adjustment.", { exact: true }));

    await page.getByLabel("Reviewing persona").selectOption("Sample Treasury reviewer");
    await page.getByRole("button", { name: "Approve sample adjustment", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Approve sample adjustment" }).click();
    await visible(page.getByText(/DEMO-ADJ-001-1 was completed by a separate fictional persona/));
    assert.match(await page.locator("#main-content").innerText(), /Gross collection\s+₱1,250\.00/);
    assert.match(await page.locator("#main-content").innerText(), /Partially refunded/);

    await open("/ops/treasury/adjustments/DEMO-ADJ-005-1");
    await visible(page.getByRole("heading", { name: "DEMO-ADJ-005-1", exact: true }));
    assert.match(await page.locator("#main-content").innerText(), /exceeds the remaining adjustable amount by ₱50\.00/);
    await page.getByRole("button", { name: "Approve sample adjustment", exact: true }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Approve sample adjustment" }).click();
    await visible(page.getByText(/exceeds the 80000 centavo remaining adjustable amount/));
    assert.match(await page.locator("#main-content").innerText(), /Gross collection\s+₱800\.00/);
  });
  await check("M05 selectable empty, error, denied, and slow states", async () => {
    await open("/ops");
    await page.getByLabel("Demo persona").selectOption("municipal");
    await page.getByLabel("Preview state").selectOption("empty");
    await open("/ops/documents");
    await visible(page.getByRole("heading", { name: "No sample document records", exact: true }));

    await open("/ops");
    await page.getByLabel("Preview state").selectOption("error");
    await open("/ops/documents");
    await visible(page.getByRole("heading", { name: "The sample document workspace could not load.", exact: true }));
    assert.match(await page.locator("#main-content").innerText(), /No network request was made/);

    await open("/ops");
    await page.getByLabel("Preview state").selectOption("denied");
    await open("/ops/documents/DEMO-DOC-006");
    await visible(
      page.getByRole("heading", { name: "Document workspace unavailable in this preview state", exact: true }),
    );
    assert.doesNotMatch(await page.locator("#main-content").innerText(), /Restricted legal correspondence/);

    await open("/ops");
    await page.getByLabel("Preview state").selectOption("slow");
    await page.goto(`${baseURL}/ops/documents`, { waitUntil: "domcontentloaded" });
    await visible(page.getByRole("status", { name: "Loading sample document records" }));
    await visible(page.getByRole("heading", { name: "Document register", exact: true }));

    await open("/ops");
    await page.getByLabel("Preview state").selectOption("normal");
  });
  await check("Responsive layouts at 1440, 1024, 768, 390, and 360 pixels", async () => {
    for (const width of [1440, 1024, 768, 390, 360]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of [
        "/",
        "/services",
        "/services/business-permits",
        "/auth/phone",
        "/auth/verify",
        "/auth/recover",
        "/staff/sign-in",
        "/account/profile",
        "/account/id",
        "/track",
        "/ops",
        "/ops/identity/applications",
        "/ops/residents",
        "/ops/residents/new",
        "/ops/residents/DEMO-PER-001",
        "/ops/households",
        "/ops/households/DEMO-HH-001",
        "/ops/registry/review",
        "/ops/registry/surveys",
        "/ops/documents",
        "/ops/documents/DEMO-DOC-001",
        "/ops/documents/archive",
        "/ops/documents/new",
        "/ops/routing/inbox",
        "/ops/routing/templates",
        "/ops/treasury/collections",
        "/ops/treasury/reconciliation",
        "/ops/treasury/adjustments/DEMO-ADJ-001-1",
        "/ops/treasury/receipts/DEMO-RCP-008",
        "/track/documents/DOC-2026-0048",
        "/verify/id/DEMO-ID-TOKEN-UNKNOWN",
      ]) {
        await open(path);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          `${path} overflow at ${width}px`,
        );
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await open("/");
    await page.screenshot({ path: fileURLToPath(new URL("landing-mobile.png", output)), fullPage: true });
    await page.screenshot({ path: fileURLToPath(new URL("landing-mobile-viewport.png", output)) });
    await page.getByRole("button", { name: "Open navigation", exact: true }).click();
    await visible(page.getByRole("navigation", { name: "Mobile navigation", exact: true }));
    await page
      .getByRole("navigation", { name: "Mobile navigation", exact: true })
      .getByRole("link", { name: "Services", exact: true })
      .click();
    await page.waitForURL("**/services");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await page.getByRole("dialog").count(), 0);
    await open("/ops");
    await page.getByRole("button", { name: "Toggle workspace navigation", exact: true }).click();
    await visible(page.getByRole("dialog"));
    await page.getByRole("dialog").getByRole("button", { name: "People & barangays", exact: true }).click();
    await visible(page.getByRole("heading", { name: "People & barangays", exact: true }));
    await page.getByRole("dialog").waitFor({ state: "detached" });
    assert.equal(await page.getByRole("dialog").count(), 0);
    await page.screenshot({ path: fileURLToPath(new URL("workspace-mobile.png", output)), fullPage: true });
    await open("/ops/residents");
    await visible(page.getByText("DEMO-PER-001", { exact: true }));
    await page.screenshot({ path: fileURLToPath(new URL("m01-residents-mobile.png", output)), fullPage: true });
  });
  await check("Public links resolve and unknown routes show a helpful 404", async () => {
    await open("/");
    const paths = await page
      .locator("a[href]")
      .evaluateAll((links) => [
        ...new Set(
          links
            .map((link) => link.getAttribute("href"))
            .filter((href) => href.startsWith("/") && !href.startsWith("/#")),
        ),
      ]);
    for (const path of paths) {
      const response = await page.request.get(baseURL + path);
      assert.equal(response.status(), 200, path);
    }
    const missing = await page.goto(`${baseURL}/services/unknown-service`);
    assert.equal(missing.status(), 404);
    await visible(page.getByRole("heading", { name: "Let’s get you back on track." }));
  });
  assert.deepEqual(errors, [], "Uncaught browser errors");
  assert.deepEqual([...externalRequests], [], "Unexpected external requests");
  console.log(
    `\n${checks.length} browser check groups passed. No uncaught browser errors or external service requests.`,
  );
} finally {
  await browser.close();
}
