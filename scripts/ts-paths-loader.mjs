/**
 * Minimal module resolution hook that supports the TypeScript `@/*` path alias
 * when running the test suite with Node's built-in test runner.
 *
 * Node has no `tsconfig` awareness, so `@/lib/foo` would otherwise fail to
 * resolve outside of the Next.js bundler.
 */
import { statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

const CANDIDATE_SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".mts",
  ".js",
  ".jsx",
  ".mjs",
  "/index.ts",
  "/index.tsx",
  "/index.js",
];

function isFile(candidate) {
  try {
    return statSync(candidate).isFile();
  } catch {
    return false;
  }
}

export function resolve(specifier, context, nextResolve) {
  if (specifier === "@/" || specifier.startsWith("@/")) {
    const base = path.join(root, specifier.slice(2));

    for (const suffix of CANDIDATE_SUFFIXES) {
      const candidate = base + suffix;
      if (isFile(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }

    throw new Error(`Unable to resolve path alias "${specifier}" from ${context.parentURL ?? "<entry>"}`);
  }

  return nextResolve(specifier, context);
}