import {
  buildPhoneEntryPath,
  buildSignInPath,
  buildVerifyPath,
  resolvePostSignInPath,
  sanitizeReturnPath,
} from "./account-navigation";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("M02 account navigation", () => {
  it("opens the canonical profile after an ordinary sign-in", () => {
    assert.equal(resolvePostSignInPath({}), "/account/profile");
  });

  it("preserves a validated service guide as account intent", () => {
    assert.equal(
      resolvePostSignInPath({ serviceSlug: "business-permits", returnTo: "/track" }),
      "/services/business-permits/start",
    );
  });

  it("keeps an allowed local return path and rejects unsafe destinations", () => {
    assert.equal(sanitizeReturnPath("/track?reference=DEMO-CERT-001"), "/track?reference=DEMO-CERT-001");
    assert.equal(sanitizeReturnPath("/services/municipal-id"), "/services/municipal-id");
    assert.equal(sanitizeReturnPath("https://example.com/steal"), undefined);
    assert.equal(sanitizeReturnPath("//example.com/steal"), undefined);
    assert.equal(sanitizeReturnPath("/ops"), undefined);
  });

  it("builds a sign-in link without accepting an open redirect", () => {
    assert.equal(buildSignInPath("/account/profile"), "/auth/phone?returnTo=%2Faccount%2Fprofile");
    assert.equal(buildSignInPath("https://example.com"), "/auth/phone");
  });

  it("carries one safe intent between the phone and verification routes", () => {
    assert.equal(buildVerifyPath({ serviceSlug: "municipal-id" }), "/auth/verify?service=municipal-id");
    assert.equal(
      buildPhoneEntryPath({ returnTo: "/track?reference=DEMO-CERT-001" }),
      "/auth/phone?returnTo=%2Ftrack%3Freference%3DDEMO-CERT-001",
    );
  });
});
