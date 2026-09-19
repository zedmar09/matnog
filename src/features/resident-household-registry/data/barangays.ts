import type { BarangayRef } from "../types/registry";

/** Sample scopes. These are demo names, not claims about Matnog geography. */
export const BARANGAY_A: BarangayRef = { id: "DEMO-BRGY-A", label: "Demo Barangay A" };
export const BARANGAY_B: BarangayRef = { id: "DEMO-BRGY-B", label: "Demo Barangay B" };
/**
 * A third scope so a transfer can exist that involves neither of the other
 * two. Without it, every transfer would touch Barangay A and the scoping rule
 * on the transfer queue could not be demonstrated or tested.
 */
export const BARANGAY_C: BarangayRef = { id: "DEMO-BRGY-C", label: "Demo Barangay C" };

export const BARANGAYS = [BARANGAY_A, BARANGAY_B, BARANGAY_C];
