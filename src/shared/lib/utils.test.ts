import { formatStatusLabel } from "./utils";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("formatStatusLabel", () => {
  it("title-cases a hyphenated status", () => {
    assert.equal(formatStatusLabel("awaiting-payment"), "Awaiting Payment");
    assert.equal(formatStatusLabel("not-met"), "Not Met");
    assert.equal(formatStatusLabel("under-review"), "Under Review");
  });

  it("keeps a joining word lower case after the first word", () => {
    assert.equal(formatStatusLabel("ready-for-signoff"), "Ready for Signoff");
    assert.equal(formatStatusLabel("certificate-to-file-action"), "Certificate to File Action");
  });

  it("capitalises a single word and leaves an already-cased label alone", () => {
    assert.equal(formatStatusLabel("issued"), "Issued");
    assert.equal(formatStatusLabel("Awaiting Payment"), "Awaiting Payment");
  });

  it("returns an empty string for empty input", () => {
    assert.equal(formatStatusLabel(""), "");
  });
});
