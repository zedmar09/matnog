export type ResidentMatchScenarioId = "suggested" | "no-match" | "multiple" | "shared-contact";

export type ResidentMatchScenario = {
  id: ResidentMatchScenarioId;
  label: string;
  summary: string;
  allowsLinkRequest: boolean;
};

export const RESIDENT_MATCH_SCENARIOS: readonly ResidentMatchScenario[] = [
  {
    id: "suggested",
    label: "Suggested resident match",
    summary: "One minimal registry candidate is available for confirmation.",
    allowsLinkRequest: true,
  },
  {
    id: "no-match",
    label: "No registry match",
    summary: "No resident candidate is linked automatically; assisted review is offered instead.",
    allowsLinkRequest: false,
  },
  {
    id: "multiple",
    label: "Multiple possible matches",
    summary: "Possible duplicate people require staff review before the account may select one.",
    allowsLinkRequest: false,
  },
  {
    id: "shared-contact",
    label: "Shared contact number",
    summary: "The contact may be shared, so phone verification remains separate from the chosen person.",
    allowsLinkRequest: true,
  },
];

export function getResidentMatchScenario(id: string): ResidentMatchScenario {
  return RESIDENT_MATCH_SCENARIOS.find((scenario) => scenario.id === id) ?? RESIDENT_MATCH_SCENARIOS[0];
}
