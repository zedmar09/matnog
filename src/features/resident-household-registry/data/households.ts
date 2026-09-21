import { createEnvelope } from "@/shared/data/record-envelope";

import type { Household, Structure, VulnerabilityFlag } from "../types/registry";
import { BARANGAY_A, BARANGAY_B, BARANGAY_C } from "./barangays";

/** Restricted flags are withheld from household-member projections. */
const commonFlags = (overrides: Partial<Record<string, "yes" | "no" | "unknown">> = {}) => [
  { id: "senior", label: "Has a senior member", value: overrides.senior ?? "no", restricted: false },
  { id: "pwd", label: "Has a member with a disability", value: overrides.pwd ?? "unknown", restricted: false },
  { id: "under5", label: "Has a child under five", value: overrides.under5 ?? "no", restricted: false },
  { id: "soloParent", label: "Has a solo parent", value: overrides.soloParent ?? "unknown", restricted: true },
  {
    id: "bedridden",
    label: "Has a bedridden or oxygen-dependent member",
    value: overrides.bedridden ?? "no",
    restricted: true,
  },
];

/**
 * The indicator set every household carries. A newly created household starts
 * with every value "unknown": nothing has been asked yet, and an unasked
 * question must never be recorded as a negative finding.
 */
export const VULNERABILITY_TEMPLATE: VulnerabilityFlag[] = commonFlags().map((flag) => ({
  ...flag,
  value: "unknown" as const,
}));

export const HOUSEHOLDS: Household[] = [
  {
    envelope: createEnvelope({
      id: "DEMO-HH-001",
      status: "Active",
      scope: { kind: "household", id: "DEMO-HH-001", label: "Dela Cruz household" },
      createdAt: "2015-02-10T08:00:00+08:00",
      updatedAt: "2026-08-20T10:15:00+08:00",
      version: 5,
    }),
    headPersonId: "DEMO-PER-002",
    structureId: "DEMO-STR-001",
    dwelling: {
      constructionMaterial: "Mixed concrete and wood",
      tenure: "Owned",
      waterSource: "Piped supply",
      toiletFacility: "Water-sealed",
      powerSource: "Grid connection",
      wasteDisposal: "Collected",
      internet: "yes",
    },
    socioeconomic: {
      incomeBracket: "PHP 10,000 – 19,999 monthly",
      livelihood: "Fishing and tourism services",
      foodSecurity: "yes",
    },
    vulnerabilityFlags: commonFlags({ senior: "no", pwd: "no" }),
    lastVerifiedAt: "2026-08-20",
  },
  {
    envelope: createEnvelope({
      id: "DEMO-HH-002",
      status: "Active",
      scope: { kind: "household", id: "DEMO-HH-002", label: "Dela Cruz-Santos household" },
      createdAt: "2024-11-05T08:00:00+08:00",
      updatedAt: "2026-07-02T09:00:00+08:00",
      version: 2,
    }),
    headPersonId: "DEMO-PER-003",
    structureId: "DEMO-STR-002",
    dwelling: {
      constructionMaterial: "Concrete",
      tenure: "Rented",
      waterSource: "Piped supply",
      toiletFacility: "Water-sealed",
      powerSource: "Grid connection",
      wasteDisposal: "Collected",
      internet: "unknown",
    },
    socioeconomic: {
      incomeBracket: "PHP 20,000 – 29,999 monthly",
      livelihood: "Retail",
      foodSecurity: "yes",
    },
    vulnerabilityFlags: commonFlags(),
    lastVerifiedAt: "2026-07-02",
  },
  {
    // Stale-verification fixture: the household exists but has not been
    // re-verified, so the directory can demonstrate the staleness filter.
    envelope: createEnvelope({
      id: "DEMO-HH-003",
      status: "Active",
      scope: { kind: "household", id: "DEMO-HH-003", label: "Bermudo household" },
      createdAt: "2021-08-03T08:00:00+08:00",
      updatedAt: "2025-02-14T09:00:00+08:00",
      version: 1,
    }),
    headPersonId: "DEMO-PER-006",
    structureId: "DEMO-STR-001",
    dwelling: {
      constructionMaterial: "Light materials",
      tenure: "Occupied with consent",
      waterSource: "Shared standpipe",
      toiletFacility: "Shared",
      powerSource: "Shared connection",
      wasteDisposal: "Burned",
      internet: "no",
    },
    socioeconomic: {
      incomeBracket: "Below PHP 10,000 monthly",
      livelihood: "Small retail",
      foodSecurity: "unknown",
    },
    vulnerabilityFlags: commonFlags({ senior: "unknown", soloParent: "yes", under5: "yes" }),
    lastVerifiedAt: "2025-02-14",
  },
  {
    envelope: createEnvelope({
      id: "DEMO-HH-004",
      status: "Active",
      scope: { kind: "household", id: "DEMO-HH-004", label: "Alcantara household" },
      createdAt: "2020-05-19T08:00:00+08:00",
      updatedAt: "2026-06-01T09:00:00+08:00",
      version: 3,
    }),
    headPersonId: "DEMO-PER-009",
    structureId: "DEMO-STR-003",
    dwelling: {
      constructionMaterial: "Wood",
      tenure: "Rent-free with consent",
      waterSource: "Communal tap stand",
      toiletFacility: "Closed pit",
      powerSource: "Shared connection",
      wasteDisposal: "Burned",
      internet: "no",
    },
    socioeconomic: {
      incomeBracket: "Below PHP 10,000 monthly",
      livelihood: "Dressmaking and farm labour",
      foodSecurity: "unknown",
    },
    vulnerabilityFlags: commonFlags({ senior: "yes", soloParent: "yes" }),
    lastVerifiedAt: "2026-06-01",
  },
];

export const STRUCTURES: Structure[] = [
  {
    envelope: createEnvelope({
      id: "DEMO-STR-001",
      status: "Active",
      scope: { kind: "barangay", id: BARANGAY_A.id, label: BARANGAY_A.label },
      createdAt: "2015-02-10T08:00:00+08:00",
      updatedAt: "2026-08-20T10:15:00+08:00",
      version: 2,
    }),
    barangay: BARANGAY_A,
    sitio: "",
    purok: "Purok 1",
    street: "Seaside Street",
    houseNumber: "12",
    coordinates: { latitude: 12.5842, longitude: 124.0861 },
    // Two households share this structure, so member counts must stay separate.
    householdIds: ["DEMO-HH-001", "DEMO-HH-003"],
  },
  {
    envelope: createEnvelope({
      id: "DEMO-STR-002",
      status: "Active",
      scope: { kind: "barangay", id: BARANGAY_B.id, label: BARANGAY_B.label },
      createdAt: "2024-11-05T08:00:00+08:00",
      updatedAt: "2026-07-02T09:00:00+08:00",
      version: 1,
    }),
    barangay: BARANGAY_B,
    sitio: "",
    purok: "Purok 3",
    street: "Hillside Road",
    houseNumber: "4-B",
    // No coordinates captured: the address must still be usable without them.
    householdIds: ["DEMO-HH-002"],
  },
  {
    envelope: createEnvelope({
      id: "DEMO-STR-003",
      status: "Active",
      scope: { kind: "barangay", id: BARANGAY_C.id, label: BARANGAY_C.label },
      createdAt: "2020-05-19T08:00:00+08:00",
      updatedAt: "2026-06-01T09:00:00+08:00",
      version: 1,
    }),
    barangay: BARANGAY_C,
    sitio: "",
    purok: "Purok 5",
    street: "Riverside Path",
    houseNumber: "31",
    householdIds: ["DEMO-HH-004"],
  },
];
