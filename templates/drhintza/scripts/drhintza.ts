#!/usr/bin/env npx tsx
/**
 * drhintza — Pre-native-deploy validation gate.
 * Run before `publisher_build_ios` or `publisher_build_android`.
 *
 * Usage: npx tsx scripts/drhintza.ts
 *
 * Checks:
 *   1. VITE_* env vars are defined in .env
 *   2. iOS Firebase config exists (GoogleService-Info.plist)
 *   3. Android Firebase config exists (google-services.json)
 *   4. TypeScript compiles (tsc --noEmit)
 *   5. Vite build succeeds (npm run build)
 *   6. Playwright smoke tests pass (npx playwright test)
 *
 * Exits with code 1 on any failure — safe for CI/gate scripts.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { globSync } from "glob";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

const ROOT = resolve(import.meta.dirname, "..");

function log(label: string, ok: boolean, detail?: string) {
  const icon = ok ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`  ${icon} ${BOLD}${label}${RESET}${detail ? ` — ${detail}` : ""}`);
}

function checkFile(path: string, label: string): boolean {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) {
    log(label, false, `not found at ${path}`);
    return false;
  }
  log(label, true);
  return true;
}

function exec(cmd: string, label: string): boolean {
  try {
    execSync(cmd, { cwd: ROOT, stdio: "pipe", timeout: 120_000 });
    log(label, true);
    return true;
  } catch (e: any) {
    const output = e.stdout?.toString()?.slice(0, 500) || "";
    const err = e.stderr?.toString()?.slice(0, 500) || "";
    log(label, false, err || output || "command failed");
    return false;
  }
}

function main(): void {
  console.log(`\n  ${BOLD}drhintza — pre-native-deploy gate${RESET}\n`);

  // 1. Environment Variables
  const envFile = resolve(ROOT, ".env");
  if (!existsSync(envFile)) {
    log("Environment Variables", false, ".env not found");
    process.exit(1);
  }

  const envContent = readFileSync(envFile, "utf-8");
  const definedVars = new Set(
    [...envContent.matchAll(/^(VITE_\w+)=/gm)].map((m) => m[1]),
  );

  const srcDir = resolve(ROOT, "src");
  if (!existsSync(srcDir)) {
    log("Environment Variables", false, "src/ directory not found");
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
    log("Environment Variables", false, `missing: ${missing.join(", ")}`);
    process.exit(1);
  }
  log("Environment Variables", true);

  // 2. iOS Firebase Config
  if (!checkFile("ios/App/App/GoogleService-Info.plist", "iOS Firebase Config")) {
    process.exit(1);
  }

  // 3. Android Firebase Config
  if (!checkFile("android/app/google-services.json", "Android Firebase Config")) {
    process.exit(1);
  }

  // 4. TypeScript
  if (!exec("npx tsc --noEmit", "TypeScript")) {
    process.exit(1);
  }

  // 5. Build
  if (!exec("npm run build", "Build")) {
    process.exit(1);
  }

  // 6. Smoke Tests
  if (!exec("npx playwright test", "Smoke Tests")) {
    process.exit(1);
  }

  console.log(`\n  ${GREEN}${BOLD}All checks passed — ready for native build!${RESET}\n`);
}

main();
