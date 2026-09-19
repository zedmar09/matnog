import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

import assert from "node:assert/strict";

const baseURL = process.env.PREVIEW_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
let checked = 0;
async function scan(label) {
  // Pages that stream media never reach `networkidle`; `load` plus the
  // rendered main region is the reliable signal.
  await page.locator("#main-content, main").first().waitFor({ state: "visible" });
  // Client navigation can update the route before Next has restored metadata.
  // Wait for the real page title so axe does not inspect that transient frame.
  await page.waitForFunction(() => document.title.trim().length > 0);
  await page.evaluate(async () => {
    await Promise.allSettled(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished),
    );
  });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
    [],
    label,
  );
  checked++;
  console.log("PASS", label);
}
try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/services",
      "/services/business-permits",
      "/services/business-permits/start",
      "/visit",
      "/help",
      "/credits",
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
      "/ops/residents/DEMO-PER-001",
      "/ops/households",
      "/ops/households/DEMO-HH-001",
      "/ops/registry/review",
      "/ops/registry/surveys",
      "/ops/residents/new",
      "/ops/documents",
      "/ops/documents/DEMO-DOC-001",
      "/ops/documents/DEMO-DOC-005",
      "/ops/documents/DEMO-DOC-006",
      "/ops/documents/DEMO-DOC-007",
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
      "/payments",
      "/payments/assessments/DEMO-ASM-002",
      "/payments/attempts/DEMO-ATT-002",
      "/payments/receipts/DEMO-RCP-008",
    ]) {
      await page.goto(baseURL + path, { waitUntil: "load" });
      // Registry screens load their rows after the shell settles.
      await page.locator("#main-content").waitFor({ state: "visible" });
      await scan(`${path} at ${width}px`);
    }
  }
  await page.goto(`${baseURL}/auth/phone`, { waitUntil: "load" });
  await page.getByRole("button", { name: /Use demo number/ }).click();
  await page.getByRole("button", { name: "Continue with mobile number" }).click();
  await page.waitForURL("**/auth/verify");
  await page.getByLabel("Six-digit code").waitFor({ state: "visible" });
  await scan("OTP entry");
  await page.getByLabel("Six-digit code").fill("123456");
  await page.getByRole("button", { name: "Verify & continue" }).click();
  await page.waitForURL("**/account/profile");
  await scan("Signed-in account");
  for (const path of [
    "/payments",
    "/payments/assessments/DEMO-ASM-003",
    "/payments/attempts/DEMO-ATT-002",
    "/payments/receipts/DEMO-RCP-008",
  ]) {
    await page.goto(baseURL + path, { waitUntil: "load" });
    await page.locator("#main-content").waitFor({ state: "visible" });
    await scan(`Signed-in ${path}`);
  }
  await page.goto(`${baseURL}/track`, { waitUntil: "load" });
  await page.getByRole("button", { name: "DEMO-CERT-001", exact: true }).click();
  await page.getByRole("button", { name: "Track request", exact: true }).click();
  await page.getByRole("heading", { name: "Barangay residency certificate" }).waitFor({ state: "visible" });
  await scan("Request timeline");
  await page.goto(`${baseURL}/ops`, { waitUntil: "load" });
  await page.getByRole("button", { name: "View scope for M10", exact: true }).click();
  await scan("Restricted-module scope dialog");
  console.log(`\n${checked} automated accessibility scans passed. Manual review is still needed for full conformance.`);
} finally {
  await browser.close();
}
