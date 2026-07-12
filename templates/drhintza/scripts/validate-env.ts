#!/usr/bin/env npx tsx
/**
 * validate-env — Checks that all VITE_* env vars referenced in source
 *               are defined in the local `.env` file.
 *
 * Can run standalone or as part of drhintza.
 * Usage: npx tsx scripts/validate-env.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { globSync } from "glob";

const ROOT = resolve(import.meta.dirname, "..");
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

function main(): void {
  const envFile = resolve(ROOT, ".env");

  if (!existsSync(envFile)) {
    console.error(`${RED}✗ .env not found at ${envFile}${RESET}`);
    process.exit(1);
  }

  const envContent = readFileSync(envFile, "utf-8");
  const definedVars = new Set(
    [...envContent.matchAll(/^(VITE_\w+)=/gm)].map((m) => m[1]),
  );

  const srcDir = resolve(ROOT, "src");
  if (!existsSync(srcDir)) {
    console.error(`${RED}✗ src/ directory not found${RESET}`);
    process.exit(1);
  }

  const srcFiles = globSync("**/*.{ts,tsx,js,jsx}", {
    cwd: srcDir,
    ignore: ["**/node_modules/**"],
  });

  const referencedVars = new Set<string>();
  for (const file of srcFiles) {
    const content = readFileSync(resolve(srcDir, file), "utf-8");
    for (const match of content.matchAll(/import\.meta\.env\.(VITE_\w+)/g)) {
      referencedVars.add(match[1]);
    }
  }

  const missing = [...referencedVars].filter((v) => !definedVars.has(v));

  if (missing.length > 0) {
    console.error(`${RED}✗ Missing VITE_* vars in .env:${RESET}`);
    for (const v of missing) {
      console.error(`    ${v}`);
    }
    process.exit(1);
  }

  console.log(`${GREEN}✓ All ${referencedVars.size} VITE_* vars are defined${RESET}`);
}

main();
