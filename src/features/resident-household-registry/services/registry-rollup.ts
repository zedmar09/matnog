import { demoClock } from "@/shared/data/demo-clock";
import { ok, type RepositoryResult } from "@/shared/data/repository-result";

import { BARANGAYS } from "../data/barangays";
import type { BarangayRef } from "../types/registry";
import type { RegistryActor } from "./registry-projections";
import { listHouseholds, listResidents } from "./registry-repository";

export type RegistryRollupRow = {
  barangay: BarangayRef;
  snapshotId: string;
  asOf: string;
  residentCount: number;
  verifiedResidents: number;
  householdCount: number;
  verifiedHouseholds: number;
  vulnerabilityHouseholds: number;
};

/** Dated aggregate evidence only. No names, protected flags, or case details
 * cross from M01 into planning and reporting. */
export async function readRegistryRollup(actor: RegistryActor): Promise<RepositoryResult<RegistryRollupRow[]>> {
  const [residents, households] = await Promise.all([listResidents(actor), listHouseholds(actor)]);
  if (residents.kind !== "success") return residents as RepositoryResult<RegistryRollupRow[]>;
  if (households.kind !== "success") return households as RepositoryResult<RegistryRollupRow[]>;
  const asOf = demoClock.now().toISOString().slice(0, 10);
  const visibleBarangays = actor.barangayId
    ? BARANGAYS.filter((barangay) => barangay.id === actor.barangayId)
    : BARANGAYS;
  return ok(
    visibleBarangays.map((barangay) => {
      const people = residents.data.filter(
        (row) =>
          row.person.lifeStatus === "living" &&
          row.person.residency.some((period) => !period.to && period.barangay.id === barangay.id),
      );
      const dwellings = households.data.filter(
        (row) => !row.household.closure && row.structure?.barangay.id === barangay.id,
      );
      const residentCount = people.length;
      const verifiedResidents = people.filter((row) => row.person.verification.state === "verified").length;
      const householdCount = dwellings.length;
      const verifiedHouseholds = dwellings.filter((row) => Boolean(row.household.lastVerifiedAt)).length;
      const vulnerabilityHouseholds = dwellings.filter((row) =>
        row.household.vulnerabilityFlags.some((flag) => flag.value === "yes"),
      ).length;
      const sourceVersion =
        people.reduce((sum, row) => sum + row.person.envelope.version, 0) +
        dwellings.reduce((sum, row) => sum + row.household.envelope.version, 0);
      return {
        barangay,
        asOf,
        snapshotId: [
          "M01-ROLLUP",
          barangay.id,
          asOf.replaceAll("-", ""),
          residentCount,
          verifiedResidents,
          householdCount,
          verifiedHouseholds,
          vulnerabilityHouseholds,
          sourceVersion,
        ].join("-"),
        residentCount,
        verifiedResidents,
        householdCount,
        verifiedHouseholds,
        vulnerabilityHouseholds,
      };
    }),
  );
}
