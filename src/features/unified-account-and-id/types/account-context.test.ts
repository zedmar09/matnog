import {
  canAccessAccountSurface,
  createDemoVisitorSession,
  createResidentAssociation,
  type DemoSession,
  resolveAccountState,
  restoreDemoSession,
} from "./account-context";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("M02 account boundaries", () => {
  it("creates a phone-verified visitor without a resident claim", () => {
    const session = createDemoVisitorSession();

    assert.equal(session.accountId, "DEMO-VIS-001");
    assert.equal(session.phoneVerification, "verified");
    assert.equal(session.residentAssociation, undefined);
    assert.equal(resolveAccountState(session), "visitor");
  });

  it("keeps pending and linked resident states distinct", () => {
    const visitor = createDemoVisitorSession();
    const pending: DemoSession = {
      ...visitor,
      residentAssociation: createResidentAssociation("pending"),
    };
    const resident: DemoSession = {
      ...visitor,
      residentAssociation: createResidentAssociation("linked"),
    };

    assert.equal(resolveAccountState(pending), "resident-link-pending");
    assert.equal(resolveAccountState(resident), "verified-resident");
    assert.equal(pending.residentAssociation?.requestId, "DEMO-LINK-001");
    assert.equal(pending.residentAssociation?.reviewStage, "municipal-registry-review");
  });

  it("allows resident surfaces only after a reviewed link", () => {
    const visitor = createDemoVisitorSession();
    const resident: DemoSession = {
      ...visitor,
      residentAssociation: createResidentAssociation("linked"),
    };

    assert.equal(canAccessAccountSurface(null, "public"), true);
    assert.equal(canAccessAccountSurface(null, "account"), false);
    assert.equal(canAccessAccountSurface(visitor, "account"), true);
    assert.equal(canAccessAccountSurface(visitor, "resident"), false);
    assert.equal(canAccessAccountSurface(resident, "resident"), true);
    assert.equal(canAccessAccountSurface(resident, "staff"), false);
  });

  it("migrates the earlier demo marker without granting extra access", () => {
    const restored = restoreDemoSession({
      version: 1,
      name: "Mara Dela Cruz",
      residentAssociation: { personId: "DEMO-PER-001", status: "pending" },
    });

    assert.ok(restored);
    assert.equal(restored.version, 2);
    assert.equal(restored.accountId, "DEMO-VIS-001");
    assert.equal(resolveAccountState(restored), "resident-link-pending");
  });

  it("rejects malformed or unknown persisted sessions", () => {
    assert.equal(restoreDemoSession(null), null);
    assert.equal(restoreDemoSession({ version: 2, name: "Someone else" }), null);
    assert.equal(
      restoreDemoSession({
        version: 2,
        accountId: "DEMO-VIS-001",
        name: "Mara Dela Cruz",
        phoneVerification: "verified",
        residentAssociation: { personId: "DEMO-PER-999", status: "linked" },
      }),
      null,
    );
  });
});
