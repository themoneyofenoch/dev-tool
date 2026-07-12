# drhintza 🚦

Pre-native-deploy validation gate for Capacitor apps shipping to **App Store** and **Google Play**.

## What it does

Run this before building native binaries. It blocks with exit code 1 if anything is wrong:

```
  drhintza — pre-native-deploy gate

  ✓ Environment Variables       — VITE_* vars match .env
  ✓ iOS Firebase Config         — ios/App/App/GoogleService-Info.plist exists
  ✓ Android Firebase Config     — android/app/google-services.json exists
  ✓ TypeScript                  — tsc --noEmit passes
  ✓ Build                       — npm run build succeeds
  ✓ Smoke Tests                 — npx playwright test passes

  All checks passed — ready for native build!
```

## Install

```bash
# Copy template into your project
cp -r templates/drhintza/* /path/to/your/project/

# Install deps
npm install -D @playwright/test tsx glob

# Add to your package.json
npm pkg set scripts.drhintza="npx tsx scripts/drhintza.ts"
npx playwright install chromium
```

## Use

```bash
npm run drhintza       # run all 6 checks
# If it passes:
publisher_build_ios    # → TestFlight
publisher_build_android # → Google Play
```

## Customize

- **`e2e/smoke.spec.ts`** — add tests for your app's core flows (signup, payment, content load)
- **`scripts/drhintza.ts`** — add/remove checks (e.g., skip Android if iOS-only)
- **`scripts/validate-env.ts`** — adjust if you use different env var prefixes
