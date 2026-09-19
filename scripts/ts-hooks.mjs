// Node strips TypeScript types natively but still resolves ESM strictly, so the
// extensionless and "@/" specifiers this project uses need help. These hooks
// add that resolution for `npm run test:unit` only; the app itself is resolved
// by Next.
import { existsSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcDir = fileURLToPath(new URL("../src/", import.meta.url));

async function tryResolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch {
    return undefined;
  }
}

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;

  if (target.startsWith("@/")) {
    const absolute = resolvePath(srcDir, target.slice(2));
    target = pathToFileURL(absolute).href;
  } else if (target.startsWith(".") && context.parentURL) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    target = pathToFileURL(resolvePath(parentDir, target)).href;
  } else {
    return nextResolve(specifier, context);
  }

  for (const candidate of [target, `${target}.ts`, `${target}.tsx`, `${target}/index.ts`]) {
    if (candidate !== target && !existsSync(fileURLToPath(candidate))) continue;
    const resolved = await tryResolve(candidate, context, nextResolve);
    if (resolved) return resolved;
  }
  return nextResolve(specifier, context);
}
