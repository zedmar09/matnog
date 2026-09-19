import { recoverySchema, staffMfaSchema } from "./auth-schema";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("M02 recovery and staff verification schemas", () => {
  it("requires a different recovery number and an explanatory reason", () => {
    assert.equal(
      recoverySchema.safeParse({ currentPhone: "09170000000", newPhone: "09170000000", reason: "Lost my phone" })
        .success,
      false,
    );
    assert.equal(
      recoverySchema.safeParse({
        currentPhone: "09170000000",
        newPhone: "09171111111",
        reason: "The original demo handset is unavailable.",
      }).success,
      true,
    );
  });

  it("requires a six-digit staff verification code", () => {
    assert.equal(staffMfaSchema.safeParse({ code: "123" }).success, false);
    assert.equal(staffMfaSchema.safeParse({ code: "654321" }).success, true);
  });
});
