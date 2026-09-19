export type AuthScenario = "normal" | "sms-unavailable" | "rate-limited" | "expired-code";
export type ChallengeScenario = "normal" | "expired-code";

export type AuthChallenge = {
  phone: string;
  issuedAt: number;
  generation: number;
  scenario: ChallengeScenario;
  serviceSlug?: string;
  returnTo?: string;
};

export type StartChallengeResult =
  | { kind: "ready"; challenge: AuthChallenge }
  | { kind: "blocked"; reason: "sms-unavailable" | "rate-limited"; message: string };

const CODE_LIFETIME_MS = 5 * 60 * 1000;
export const DEMO_OTP_CODE = "123456";

export const AUTH_SCENARIOS: ReadonlyArray<{ value: AuthScenario; label: string }> = [
  { value: "normal", label: "Normal delivery" },
  { value: "sms-unavailable", label: "SMS unavailable" },
  { value: "rate-limited", label: "Too many attempts" },
  { value: "expired-code", label: "Expired code" },
];

export function startChallenge(
  input: {
    phone: string;
    scenario: AuthScenario;
    serviceSlug?: string;
    returnTo?: string;
  },
  now = Date.now(),
): StartChallengeResult {
  if (input.scenario === "sms-unavailable") {
    return {
      kind: "blocked",
      reason: "sms-unavailable",
      message: "Demo SMS delivery is unavailable. No code was sent and the account was not opened.",
    };
  }
  if (input.scenario === "rate-limited") {
    return {
      kind: "blocked",
      reason: "rate-limited",
      message: "Too many demo attempts. Choose another preview state or use account recovery.",
    };
  }
  return {
    kind: "ready",
    challenge: {
      phone: input.phone,
      issuedAt: now,
      generation: 1,
      scenario: input.scenario,
      serviceSlug: input.serviceSlug,
      returnTo: input.returnTo,
    },
  };
}

export function resendChallenge(challenge: AuthChallenge, now = Date.now()): AuthChallenge {
  return {
    ...challenge,
    issuedAt: now,
    generation: challenge.generation + 1,
    scenario: "normal",
  };
}

export function isChallengeExpired(challenge: AuthChallenge, now = Date.now()): boolean {
  return challenge.scenario === "expired-code" || now - challenge.issuedAt >= CODE_LIFETIME_MS;
}

export function verifyChallenge(
  challenge: AuthChallenge,
  code: string,
  now = Date.now(),
): "verified" | "incorrect" | "expired" {
  if (isChallengeExpired(challenge, now)) return "expired";
  return code === DEMO_OTP_CODE ? "verified" : "incorrect";
}
