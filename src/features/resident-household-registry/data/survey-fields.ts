import type { TriState } from "../types/registry";

export type SurveyFieldKind = "select" | "text" | "tri";

export type SurveyField = {
  /** Dotted path into the household record this answer updates. */
  path: string;
  label: string;
  kind: SurveyFieldKind;
  options?: string[];
  hint?: string;
};

/** Three-state answers keep "unknown" distinct from "no". */
export const TRI_OPTIONS: { value: TriState; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "unknown", label: "Unknown" },
];

/** What the enumerator found about each listed member during the visit. */
export const MEMBER_OUTCOMES = [
  { value: "present", label: "Still lives here" },
  { value: "away", label: "Temporarily away" },
  { value: "left", label: "No longer a member" },
] as const;

/**
 * The questions each survey section asks. Every field writes to a field the
 * household record already holds, so a completed survey updates the record
 * rather than producing a parallel copy of it.
 */
export const SURVEY_FIELDS: Record<string, SurveyField[]> = {
  members: [],
  dwelling: [
    {
      path: "dwelling.constructionMaterial",
      label: "Construction material",
      kind: "select",
      options: ["Concrete", "Mixed concrete and wood", "Wood", "Light materials", "Salvaged materials"],
    },
    {
      path: "dwelling.tenure",
      label: "Tenure",
      kind: "select",
      options: ["Owned", "Renting", "Rent-free with consent", "Caretaker", "Informal occupancy"],
    },
  ],
  services: [
    {
      path: "dwelling.waterSource",
      label: "Water source",
      kind: "select",
      options: ["Piped supply", "Communal tap stand", "Deep well", "Rainwater", "Delivered or bought"],
    },
    {
      path: "dwelling.toiletFacility",
      label: "Toilet facility",
      kind: "select",
      options: ["Water-sealed", "Closed pit", "Open pit", "Shared facility", "None"],
    },
    {
      path: "dwelling.powerSource",
      label: "Power source",
      kind: "select",
      options: ["Grid connection", "Shared connection", "Generator", "Solar", "None"],
    },
    {
      path: "dwelling.wasteDisposal",
      label: "Waste disposal",
      kind: "select",
      options: ["Collected", "Composted", "Burned", "Buried", "No arrangement"],
    },
    { path: "dwelling.internet", label: "Internet at home", kind: "tri" },
  ],
  livelihood: [
    {
      path: "socioeconomic.incomeBracket",
      label: "Income bracket",
      kind: "select",
      options: [
        "Below PHP 10,000 monthly",
        "PHP 10,000 – 19,999 monthly",
        "PHP 20,000 – 29,999 monthly",
        "PHP 30,000 and above monthly",
      ],
    },
    {
      path: "socioeconomic.livelihood",
      label: "Main livelihood",
      kind: "text",
      hint: "For example: fishing, farming, tourism services",
    },
    {
      path: "socioeconomic.foodSecurity",
      label: "Enough food in the past week",
      kind: "tri",
      hint: "Unknown when the question was not asked.",
    },
  ],
  // Vulnerability fields are built from the household's own flags.
  vulnerability: [],
};
