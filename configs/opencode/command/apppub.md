---
description: Auto-fill AppPub from current project — /apppub [app-name] or /apppub --save-creds
---

Generate an AppPub config from a project and auto-fill all 6 wizard steps.

## Usage

- `/apppub` — detect current project, generate config, show summary
- `/apppub mizaney` — generate config for a specific project
- `/apppub --save-creds` — save Apple/Google credentials to the vault
- `/apppub --list-creds` — show what credentials are stored

## Steps

### 1. Detect the project

If `$ARGUMENTS` is empty or `--save-creds`/`--list-creds` flags are used, handle those first.
Otherwise, resolve the project:
- If `$ARGUMENTS` matches a name in `~/.config/kilo/projects/`, use that path
- If `$ARGUMENTS` is empty, use the current working directory
- Read `report.md` and `AGENTS.md` for context

### 2. Read project metadata

Extract from the project directory:

```
package.json → appName, version, description
README.md    → subtitle, description, keywords, releaseNotes
index.html   → title, existing favicon
public/      → icon files, splash screens
src/         → detect features by scanning imports
```

**Store listing extraction from README.md:**
- First paragraph (up to first blank line) → `description`
- First sentence of first paragraph → `subtitle` (max 30 chars, truncate with …)
- Lines starting with `## Keywords` or `## Tags` → `keywords` (comma-separated)
- Lines starting with `## What's New` or `## Changelog` → `releaseNotes`
- Lines starting with `## Support` or `## Contact` → `supportUrl`
- If no explicit keywords found, extract nouns from the first paragraph
- If no releaseNotes found, use `"Initial release."`

**Feature detection** — scan source files for these patterns:
- `@capacitor/camera` or `navigator.camera` → `enableCamera: true`
- `@capacitor/geolocation` or `navigator.geolocation` → `enableLocation: true`
- `@capacitor/biometrics` or `window.Fingerprint` → `enableBiometrics: true`
- `@capacitor/contacts` → `enableContacts: true`
- `@capacitor/barcode-scanner` or `@capacitor/ml-kit` → `enableQRScanner: true`
- `@capacitor/filesystem` or `window.requestFileSystem` → `enableFileStorage: true`
- `@capacitor/share` or `navigator.share` → `enableShare: true`
- `firebase`, `@firebase/messaging` → `enablePushNotifications: true`, `pushProvider: "firebase"`
- `react-i18next`, `i18next` → `enableI18n: true`
- `@stripe`, `react-native-iap` → `enableInAppPurchases: true`
- `sentry` → `enableCrashReporting: true`
- `mixpanel` → `enableAnalytics: true`, `analyticsProvider: "mixpanel"`
- `amplitude` → `enableAnalytics: true`, `analyticsProvider: "mixpanel"` (closest match)
- `@react-navigation/deep`, `universal-links` → `enableDeepLinking: true`
- `workbox`, `@capacitor/network`, `navigator.onLine` → `enableOfflineMode: true`
- `prefers-color-scheme`, `dark-theme`, `next-themes` → `enableDarkMode: true`

### 3. Check credential vault

Read from `~/.config/kilo/credentials/default.json` if it exists:
```
appleIssuerId, appleKeyId, appleKeyContent, googlePlayJson,
matchGitUrl, matchPassword, slackWebhookUrl, githubToken
```

Merge vault credentials into the config. User-specific values from the project always override vault defaults.

### 4. Generate config and open AppPub

Build the AppPub-compatible JSON matching the `AppConfig` interface from `~/Developer/projects/AppPub/src/app/types.ts`.

Save to `<project-dir>/apppub-config.json`.

Also save a copy to `~/Developer/projects/AppPub/public/configs/<appname>.json` so the config is available on the deployed AppPub via `?config=<appname>` URL param. Use a lowercase, alphanumeric version of the app name (e.g. `Latin Dance Hub` → `latindancehub`).

Then create a launcher HTML file at `<project-dir>/apppub-launch.html` that:
1. Embeds the config JSON inline
2. Opens `https://apppub.nakfaai.com` in a new tab
3. Sends the config to AppPub via `postMessage` after it loads
4. Auto-redirects itself to AppPub after 1 second

The launcher HTML template:

```html
<!DOCTYPE html>
<html><head><title>AppPub - Loading...</title></head>
<body>
<script>
const config = PASTE_CONFIG_JSON_HERE;
const w = window.open("https://apppub.nakfaai.com", "_blank");
setTimeout(() => {
  if (w && !w.closed) w.postMessage({ type: "APPPUB_CONFIG", config }, "https://apppub.nakfaai.com");
}, 2000);
setTimeout(() => { window.location.href = "https://apppub.nakfaai.com"; }, 1000);
</script>
</body></html>
```

Tell the user to open the launcher file:
```
open <project-dir>/apppub-launch.html
```

AppPub receives the config via `postMessage`, merges it, and all 6 steps fill automatically. No Import button needed. Works with the online version at apppub.nakfaai.com.

### 5. Output summary

Print a compact config summary:

```
AppPub ready for <app-name>:
  Name: <appName>
  Bundle: <bundleId>
  Version: <version>
  Features: <list of detected features>
  Credentials: <from vault / not set>

Open this file to auto-fill AppPub:
  open <project-dir>/apppub-launch.html

→ Opens apppub.nakfaai.com with all 6 steps filled
→ Review, add icon/screenshots, click Generate Package

Config also available at:
  https://apppub.nakfaai.com/?config=<appname>
```

## Credential Vault

### Save credentials: `/apppub --save-creds`

Prompt for each credential (or read from `$ARGUMENTS` if provided as JSON):
1. Apple Issuer ID (UUID)
2. Apple Key ID (10 chars)
3. Apple Private Key (.p8 file path)
4. Google Play Service Account JSON (file path)
5. GitHub Token (optional)
6. Match Git URL (optional)
7. Match Password (optional)
8. Slack Webhook URL (optional)

Save to `~/.config/kilo/credentials/default.json`.

### List credentials: `/apppub --list-creds`

Show what's stored (mask sensitive values):
```
Credential Vault (~/.config/kilo/credentials/default.json):
  Apple Issuer ID: 69a6de70-****-****-****-a4d1 ✓
  Apple Key ID: 2B83T2A1W4 ✓
  Apple Private Key: -----BEGIN PRIVATE KEY----- ... ✓
  Google Play JSON: {"type":"service_account",...} ✓
  GitHub Token: ghp_**** ✓
  Match Git URL: (not set)
  Match Password: (not set)
  Slack Webhook: (not set)
```

## Smart Defaults

When generating config, apply these defaults if not detected:
- `platforms: ["ios", "android"]`
- `version: "1.0.0"` (from package.json if available)
- `bundleId: "com.<username>.<appname>"` (derive from project name)
- `ciProvider: "github"`
- `releaseNotes: "Initial release."`
- `subtitle: ""` (extract from README if possible, max 30 chars)
- `description: ""` (extract first paragraph of README if possible)
- `keywords: ""` (extract from README or derive from app name)
- `supportUrl: ""` (extract from README or derive from project URL)
- `analyticsProvider: "firebase"` (when `enableAnalytics` is true and no provider detected)
- `pushProvider: "firebase"` (when `enablePushNotifications` is true and no provider detected)
- `defaultLanguage: "en"` (when `enableI18n` is true)
- `primaryColor: "#3B82F6"`, `accentColor: "#8B5CF6"` (when `enableDarkMode` is true)
