"use client";
import { useSyncExternalStore } from "react";

import { DEMO_EPOCH_ISO, type DemoClock, demoClock } from "@/shared/data/demo-clock";

const EPOCH_MS = Date.parse(DEMO_EPOCH_ISO);

/**
 * Current demo time, as a millisecond timestamp so the snapshot stays stable
 * between renders. Advancing the clock re-renders anything showing a date, an
 * expiry or an overdue state.
 *
 * The server snapshot is always the fixed epoch: the clock only moves through
 * client interaction, so prerendered markup matches the first client render.
 */
export function useDemoNow(clock: DemoClock = demoClock): number {
  return useSyncExternalStore(
    (listener) => clock.subscribe(listener),
    () => clock.now().getTime(),
    () => EPOCH_MS,
  );
}
