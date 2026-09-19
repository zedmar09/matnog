import { MODULES } from "./modules";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/** Every static /ops route on disk, excluding dynamic segments and the root. */
function staffRoutesOnDisk(dir = "src/app/ops", prefix = "/ops"): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (entry === "page.tsx" && prefix !== "/ops") found.push(prefix);
    else if (statSync(path).isDirectory() && !entry.startsWith("[") && !entry.startsWith("._")) {
      found.push(...staffRoutesOnDisk(path, `${prefix}/${entry}`));
    }
  }
  return found;
}

test("every staff route is reachable from the workspace navigation", () => {
  const declared = new Set(MODULES.flatMap((module) => module.screens.map((screen) => screen.href)));
  const missing = staffRoutesOnDisk().filter((route) => !declared.has(route));
  assert.deepEqual(missing, [], `staff routes with no navigation entry: ${missing.join(", ")}`);
});

test("navigation does not point at routes that do not exist", () => {
  const onDisk = new Set(staffRoutesOnDisk());
  const dangling = MODULES.flatMap((module) => module.screens.map((screen) => screen.href)).filter(
    (href) => !onDisk.has(href),
  );
  assert.deepEqual(dangling, [], `navigation entries with no route: ${dangling.join(", ")}`);
});

test("each staff route belongs to exactly one module", () => {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const module of MODULES) {
    for (const screen of module.screens) {
      const owner = seen.get(screen.href);
      if (owner) duplicates.push(`${screen.href} (${owner} and ${module.id})`);
      else seen.set(screen.href, module.id);
    }
  }
  assert.deepEqual(duplicates, []);
});

test("every module exposes at least one screen", () => {
  const empty = MODULES.filter((module) => module.screens.length === 0).map((module) => module.id);
  assert.deepEqual(empty, []);
});
